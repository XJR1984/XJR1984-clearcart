import { CATALOG, getProductById } from './catalog.mjs';
import { planCart } from './planner.mjs';
import { createPayPalClient, authenticateSandbox, isValidSandboxToken, PayPalError } from './paypal.mjs';

const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_ID = /^[A-Za-z0-9]{1,36}$/;
const MAX_BODY = 16_384;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
};

class AppError extends Error {
  constructor(message, status = 400, code = 'INVALID_INPUT') { super(message); this.status = status; this.code = code; }
}
function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', ...headers } });
}

function sessionSetupAllowed(url) {
  return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
}
function sessionCookieName(url) { return url.protocol === 'https:' ? '__Host-clearcart-paypal' : 'clearcart-paypal'; }
function sessionCookie(url, token = '', maxAge = 0) {
  return `${sessionCookieName(url)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
}
function browserToken(request, url) {
  if (!sessionSetupAllowed(url)) return undefined;
  const raw = request.headers.get('cookie') || '';
  if (raw.length > 8192) throw new AppError('The saved sandbox connection is invalid. Disconnect and reconnect.', 400, 'INVALID_SESSION');
  const name = sessionCookieName(url);
  const matches = raw.split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (!matches.length) return undefined;
  if (matches.length !== 1) throw new AppError('The saved sandbox connection is invalid. Disconnect and reconnect.', 400, 'INVALID_SESSION');
  let token;
  try { token = decodeURIComponent(matches[0].slice(name.length + 1)); } catch { /* Rejected below. */ }
  if (!isValidSandboxToken(token)) throw new AppError('The saved sandbox connection is invalid. Disconnect and reconnect.', 400, 'INVALID_SESSION');
  return token;
}
function paymentConnection(request, env, url) {
  if (typeof env.PAYPAL_CLIENT_ID === 'string' && env.PAYPAL_CLIENT_ID.trim() && typeof env.PAYPAL_CLIENT_SECRET === 'string' && env.PAYPAL_CLIENT_SECRET.trim()) {
    return { mode: 'server', signingSecret: env.PAYPAL_CLIENT_SECRET, client: { clientId: env.PAYPAL_CLIENT_ID, clientSecret: env.PAYPAL_CLIENT_SECRET } };
  }
  const token = browserToken(request, url);
  return token ? { mode: 'browser_session', signingSecret: token, client: { accessToken: token } } : { mode: 'unconfigured', client: {} };
}
function base64url(bytes) {
  return btoa(Array.from(bytes, x => String.fromCharCode(x)).join('')).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function unbase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new AppError('Checkout state is invalid.');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}
async function hash(value) { return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function stableUUID(value) {
  const bytes = await hash(value);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(`clearcart-checkout-v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signState(payload, secret) {
  const data = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(data));
  return `${data}.${base64url(new Uint8Array(signature))}`;
}
async function verifyState(value, secret, now) {
  try {
    if (typeof value !== 'string' || value.length > 4096) throw new Error();
    const parts = value.split('.');
    if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await signingKey(secret), unbase64url(parts[1]), encoder.encode(parts[0]))) throw new Error();
    const payload = JSON.parse(new TextDecoder().decode(unbase64url(parts[0])));
    if (payload.version !== 1 || !Number.isSafeInteger(payload.expires) || payload.expires < now ||
      !ORDER_ID.test(payload.id) || !Number.isSafeInteger(payload.totalCents) || payload.totalCents < 1 ||
      typeof payload.customId !== 'string' || !UUID.test(payload.captureRequestId)) throw new Error();
    return payload;
  } catch { throw new AppError('This checkout is invalid or expired. Start a new checkout.', 400, 'INVALID_CHECKOUT'); }
}

async function readJSON(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AppError('Send JSON content.', 415);
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new AppError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('A JSON request is required.');
  let size = 0; const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new AppError('Request is too large.', 413); }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new AppError('A valid JSON object is required.'); }
}

function cartFromInput(input) {
  if (!Number.isSafeInteger(input.budgetCents) || input.budgetCents < 1 || input.budgetCents > 1_000_000) throw new AppError('Invalid checkout budget.');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > CATALOG.length) throw new AppError('Choose at least one catalog item.');
  if (!UUID.test(input.requestId ?? '')) throw new AppError('A checkout request reference is required.');
  const seen = new Set();
  const items = input.items.map(item => {
    const product = item && getProductById(item.id);
    if (!product || seen.has(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 5) throw new AppError('Invalid item or quantity.');
    seen.add(item.id);
    // Only the catalog determines prices. Ignore any client-supplied price fields.
    return { id: product.id, name: product.name, priceCents: product.priceCents, quantity: item.quantity };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  if (totalCents > input.budgetCents) throw new AppError('This cart exceeds your spending limit.');
  return { items, totalCents };
}
function cents(amount) {
  if (amount?.currency_code !== 'USD' || typeof amount.value !== 'string' || !/^\d+\.\d{2}$/.test(amount.value)) return null;
  const [whole, fraction] = amount.value.split('.');
  const total = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(total) ? total : null;
}
function verifyOrder(order, expected) {
  if (order.id !== expected.id || order.intent !== 'CAPTURE' || order.purchase_units?.length !== 1 ||
      order.purchase_units[0].custom_id !== expected.customId || cents(order.purchase_units[0].amount) !== expected.totalCents) {
    throw new AppError('PayPal returned an order that does not match this cart.', 502, 'ORDER_MISMATCH');
  }
}
function receipt(order, expected) {
  verifyOrder(order, expected);
  const captures = order.purchase_units[0].payments?.captures;
  if (order.status !== 'COMPLETED' || !Array.isArray(captures) || captures.length !== 1 || captures[0].status !== 'COMPLETED' ||
      cents(captures[0].amount) !== expected.totalCents || !captures[0].id) {
    throw new AppError('PayPal has not confirmed a completed capture for this cart.', 409, 'CAPTURE_NOT_COMPLETED');
  }
  return { id: order.id, status: 'COMPLETED', captureId: captures[0].id, totalCents: expected.totalCents, currency: 'USD', mode: 'sandbox' };
}

/** Identical request handler for Node development and the hosted Worker. */
export function createApp({ assets = {}, fetchImpl = fetch, now = () => Date.now() } = {}) {
  return { async fetch(request, env = {}) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      if (request.method === 'GET' || request.method === 'HEAD') {
        if (path === '/api/config') {
          const connection = paymentConnection(request, env, url);
          return json({ paypalConfigured: connection.mode !== 'unconfigured', connectionMode: connection.mode, sessionSetupAvailable: sessionSetupAllowed(url), mode: 'sandbox', version: '0.2.0', catalog: 'synthetic', paymentVerification: 'requires sandbox account test' });
        }
        if (path === '/api/catalog') return json({ items: CATALOG });
        if (path === '/api/health') return json({ status: 'ok', mode: 'sandbox' });
        const asset = assets[path];
        if (asset) return new Response(request.method === 'HEAD' ? null : asset.body, { headers: { ...SECURITY_HEADERS, 'Content-Type': asset.type, 'Cache-Control': 'no-cache' } });
        return json({ error: 'Page not found.' }, 404);
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      const origin = request.headers.get('origin');
      if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('Use checkout from the ClearCart page.', 403);
      const managesSession = path === '/api/paypal/connect' || path === '/api/paypal/disconnect';
      if (managesSession && (origin !== url.origin || !sessionSetupAllowed(url))) throw new AppError('Connect from the ClearCart page over HTTPS or localhost.', 403, 'SESSION_ORIGIN_REQUIRED');
      const input = await readJSON(request);
      if (path === '/api/paypal/disconnect') return json({ connected: false, mode: 'sandbox' }, 200, { 'Set-Cookie': sessionCookie(url) });
      if (path === '/api/paypal/connect') {
        // Browser credentials are used only for this exchange and are never logged or persisted.
        let auth;
        try { auth = await authenticateSandbox({ clientId: input.clientId, clientSecret: input.clientSecret, fetchImpl }); }
        finally { input.clientId = undefined; input.clientSecret = undefined; }
        const expiresIn = Math.min(3600, Math.floor(auth.expiresIn) - 60);
        if (expiresIn < 1) throw new AppError('PayPal returned a connection that expires too soon. Try connecting again.', 502, 'SESSION_TOO_SHORT');
        return json({ connected: true, expiresIn, mode: 'sandbox' }, 200, { 'Set-Cookie': sessionCookie(url, auth.accessToken, expiresIn) });
      }
      if (path === '/api/plan') return json(planCart(input));
      const captureMatch = path.match(/^\/api\/orders\/([A-Za-z0-9]{1,36})\/capture$/);
      if (path !== '/api/orders' && !captureMatch) return json({ error: 'Endpoint not found.' }, 404);
      const connection = paymentConnection(request, env, url);
      const paypal = createPayPalClient({ ...connection.client, fetchImpl });
      if (path === '/api/orders') {
        const { items, totalCents } = cartFromInput(input);
        const fingerprint = JSON.stringify({ items, totalCents, budgetCents: input.budgetCents });
        const customId = `clearcart-${base64url(await hash(fingerprint))}`;
        // Same request and cart reuse one key; a modified cart has a different key.
        const requestId = await stableUUID(`create:${input.requestId}:${fingerprint}`);
        const callbackOrigin = env.APP_ORIGIN?.trim() || url.origin;
        const order = await paypal.createOrder({ items, totalCents, requestId, customId, returnUrl: `${callbackOrigin}/?checkout=return`, cancelUrl: `${callbackOrigin}/?canceled=1` });
        if (!ORDER_ID.test(order.id ?? '')) throw new AppError('PayPal returned an invalid order reference.', 502);
        const expected = { id: order.id, customId, totalCents };
        verifyOrder(order, expected);
        const link = order.links?.find(x => ['payer-action', 'approve'].includes(x.rel));
        let approval;
        try { approval = new URL(link?.href); } catch { throw new AppError('PayPal did not return a checkout link. Start a new plan if this order was already completed.', 502); }
        if (approval.protocol !== 'https:' || !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(approval.hostname) || approval.username || approval.password || approval.port) throw new AppError('PayPal returned an invalid sandbox checkout link.', 502);
        const state = await signState({ ...expected, version: 1, expires: now() + 60 * 60 * 1000, captureRequestId: await stableUUID(`capture:${order.id}`) }, connection.signingSecret);
        return json({ id: order.id, state, approvalUrl: approval.href, totalCents, mode: 'sandbox' }, 201);
      }
      const expected = await verifyState(input.state, connection.signingSecret, now());
      if (expected.id !== captureMatch[1]) throw new AppError('The checkout reference does not match this order.');
      const order = await paypal.getOrder(expected.id);
      verifyOrder(order, expected);
      // A lost response can be retried without attempting another capture.
      if (order.status === 'COMPLETED') return json(receipt(order, expected));
      if (order.status !== 'APPROVED') throw new AppError('Approve this sandbox order in PayPal before completing payment.', 409, 'APPROVAL_REQUIRED');
      const captured = await paypal.captureOrder(expected.id, expected.captureRequestId);
      return json(receipt(captured, expected));
    } catch (error) {
      if (error.code === 'PAYPAL_SESSION_EXPIRED' || error.code === 'INVALID_SESSION') {
        return json({ error: error.message, code: error.code }, error.status, { 'Set-Cookie': sessionCookie(new URL(request.url)) });
      }
      if (error instanceof AppError || error instanceof PayPalError) return json({ error: error.message, code: error.code }, error.status);
      if (error instanceof TypeError || error instanceof RangeError) return json({ error: 'Check the request fields and try again.', code: 'INVALID_INPUT' }, 400);
      return json({ error: 'The request could not be completed. Please retry.', code: 'INTERNAL_ERROR' }, 500);
    }
  } };
}
