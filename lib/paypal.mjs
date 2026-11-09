/**
 * Sandbox-only Orders v2 client. This module is server-side code.
 * Official references reviewed 2026-11-08:
 * https://developer.paypal.com/api/orders/v2/orders-create
 * https://developer.paypal.com/api/orders/v2/orders-capture
 * https://developer.paypal.com/api/rest/authentication
 * https://developer.paypal.com/api/rest/reference/idempotency
 *
 * Callers must supply catalog-derived prices, bind the order to a signed checkout
 * state, check the captured amount/status, and return only necessary fields to
 * the browser. A successful HTTP response alone does not establish payment.
 */

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_TOTAL_CENTS = 1_000_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_ID_PATTERN = /^[A-Za-z0-9]{1,36}$/;
const BEARER_PATTERN = /^[A-Za-z0-9._~+\/-]{8,3072}={0,2}$/;

export function isValidSandboxToken(value) {
  return typeof value === 'string' && BEARER_PATTERN.test(value) && encodeURIComponent(value).length <= 3500;
}

export class PayPalError extends Error {
  constructor(code, message, status = 502, upstreamStatus) {
    super(message);
    this.name = 'PayPalError';
    this.code = code;
    this.status = status;
    if (Number.isInteger(upstreamStatus)) this.upstreamStatus = upstreamStatus;
  }
}

function invalid(message) {
  throw new PayPalError('INVALID_INPUT', message, 400);
}

function validRequestId(id) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    invalid('A stable UUID request ID is required.');
  }
  return id;
}

function validOrderId(id) {
  if (typeof id !== 'string' || !ORDER_ID_PATTERN.test(id)) invalid('Invalid PayPal order ID.');
  return id;
}

function money(cents) {
  return { currency_code: 'USD', value: (cents / 100).toFixed(2) };
}

function callbackUrl(value) {
  let url;
  try { url = new URL(value); } catch { invalid('Invalid checkout return URL.'); }
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) ||
      url.username || url.password || url.hash) invalid('Invalid checkout return URL.');
  return url;
}

function orderPayload({ items, totalCents, returnUrl, cancelUrl, customId }) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) invalid('A nonempty cart is required.');
  if (!Number.isSafeInteger(totalCents) || totalCents < 1 || totalCents > MAX_TOTAL_CENTS) {
    invalid('Invalid cart total.');
  }
  let sum = 0;
  const seen = new Set();
  const paypalItems = items.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(item.id) ||
        seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 127 ||
        !Number.isSafeInteger(item.priceCents) || item.priceCents < 1 || item.priceCents > MAX_TOTAL_CENTS ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      invalid('Invalid cart item.');
    }
    seen.add(item.id);
    sum += item.priceCents * item.quantity;
    return { name: item.name, sku: item.id, unit_amount: money(item.priceCents), quantity: String(item.quantity) };
  });
  if (sum !== totalCents) invalid('Cart amounts do not match.');
  const success = callbackUrl(returnUrl);
  const cancel = callbackUrl(cancelUrl);
  if (success.origin !== cancel.origin) invalid('Checkout return URLs must share an origin.');
  if (typeof customId !== 'string' || customId.length < 1 || customId.length > 255 || /[\x00-\x1f\x7f]/.test(customId)) {
    invalid('Invalid checkout reference.');
  }
  return {
    intent: 'CAPTURE',
    purchase_units: [{
      custom_id: customId,
      description: 'ClearCart sandbox demonstration; no goods are shipped.',
      amount: { ...money(totalCents), breakdown: { item_total: money(totalCents) } },
      items: paypalItems,
    }],
    payment_source: { paypal: { experience_context: {
      brand_name: 'ClearCart Sandbox',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: success.href,
      cancel_url: cancel.href,
    } } },
  };
}

function encodeBasic(value) {
  // btoa is available in both Workers and supported Node versions.
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}

export function createPayPalClient({ clientId, clientSecret, accessToken: suppliedToken, fetchImpl = fetch } = {}) {
  const usesBrowserToken = suppliedToken !== undefined;
  if (usesBrowserToken && !isValidSandboxToken(suppliedToken)) invalid('Invalid PayPal sandbox session.');
  if (!usesBrowserToken && (typeof clientId !== 'string' || !clientId.trim() || clientId.includes(':') ||
      clientId.length > 512 || /[\x00-\x20\x7f]/.test(clientId) ||
      typeof clientSecret !== 'string' || !clientSecret.trim() || clientSecret.length > 512 || /[\x00-\x20\x7f]/.test(clientSecret))) {
    throw new PayPalError('PAYPAL_NOT_CONFIGURED', 'PayPal sandbox credentials are not configured.', 503);
  }
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function.');

  let cachedToken = usesBrowserToken ? suppliedToken : null;
  let expiresAt = usesBrowserToken ? Infinity : 0;
  let providerExpiresAt = 0;
  let tokenPromise = null;

  async function send(path, options, isAuth = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(`${SANDBOX_BASE}${path}`, {
        ...options,
        signal: controller.signal,
        // Do not forward credentials if an upstream ever returns a redirect.
        redirect: 'error',
      });
      if (!response.ok) {
        if (response.status === 401) { cachedToken = null; expiresAt = 0; }
        if (usesBrowserToken && response.status === 401) {
          throw new PayPalError('PAYPAL_SESSION_EXPIRED', 'Your PayPal sandbox connection expired. Connect again and start a new checkout.', 401, 401);
        }
        throw new PayPalError(
          isAuth ? 'PAYPAL_AUTH_FAILED' : 'PAYPAL_REQUEST_FAILED',
          isAuth ? 'PayPal sandbox authentication failed. Check the configured sandbox credentials.' :
            'PayPal sandbox could not complete this request. Retry with the same checkout request.',
          502,
          response.status,
        );
      }
      let result;
      try { result = await response.json(); } catch {
        if (controller.signal.aborted) throw new PayPalError('PAYPAL_TIMEOUT', 'PayPal sandbox timed out. Retry the same checkout request.', 504);
        throw new PayPalError('PAYPAL_INVALID_RESPONSE', 'PayPal sandbox returned an unreadable response.');
      }
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new PayPalError('PAYPAL_INVALID_RESPONSE', 'PayPal sandbox returned an unreadable response.');
      }
      return result;
    } catch (error) {
      if (error instanceof PayPalError) throw error;
      if (controller.signal.aborted || error?.name === 'AbortError' || error?.name === 'TimeoutError') {
        throw new PayPalError('PAYPAL_TIMEOUT', 'PayPal sandbox timed out. Retry the same checkout request.', 504);
      }
      // Never propagate fetch errors, response bodies, or credential-bearing causes.
      throw new PayPalError('PAYPAL_UNAVAILABLE', 'PayPal sandbox is unavailable. Retry the same checkout request.');
    } finally {
      clearTimeout(timer);
    }
  }

  async function accessToken() {
    if (cachedToken && Date.now() < expiresAt) return cachedToken;
    if (usesBrowserToken) throw new PayPalError('PAYPAL_SESSION_EXPIRED', 'Your PayPal sandbox connection expired. Connect again and start a new checkout.', 401);
    if (!tokenPromise) {
      tokenPromise = (async () => {
        const result = await send('/v1/oauth2/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${encodeBasic(`${clientId}:${clientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: 'grant_type=client_credentials',
        }, true);
        if (!isValidSandboxToken(result.access_token) ||
            !Number.isFinite(result.expires_in) || result.expires_in <= 0 ||
            (result.token_type && result.token_type.toLowerCase() !== 'bearer')) {
          throw new PayPalError('PAYPAL_INVALID_RESPONSE', 'PayPal sandbox returned an invalid authentication response.');
        }
        cachedToken = result.access_token;
        providerExpiresAt = Date.now() + result.expires_in * 1000;
        expiresAt = Date.now() + Math.max(0, result.expires_in - 60) * 1000;
        return cachedToken;
      })();
    }
    try { return await tokenPromise; } finally { tokenPromise = null; }
  }

  async function request(path, method, body, requestId) {
    const token = await accessToken();
    return send(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation',
        ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  return Object.freeze({
    // Server-only: the caller must place the token in an HttpOnly cookie, never a JSON response.
    async authenticate() {
      if (usesBrowserToken) invalid('Use sandbox application credentials to connect.');
      const token = await accessToken();
      return { accessToken: token, expiresIn: Math.floor((providerExpiresAt - Date.now()) / 1000) };
    },
    async createOrder(args) {
      if (!args || typeof args !== 'object') invalid('A checkout request is required.');
      const requestId = validRequestId(args.requestId);
      const payload = orderPayload(args);
      return request('/v2/checkout/orders', 'POST', payload, requestId);
    },
    async getOrder(id) {
      return request(`/v2/checkout/orders/${validOrderId(id)}`, 'GET');
    },
    async captureOrder(id, requestId) {
      const orderId = validOrderId(id);
      validRequestId(requestId);
      return request(`/v2/checkout/orders/${orderId}/capture`, 'POST', {}, requestId);
    },
  });
}

/** Exchange credentials once; callers discard the client secret after this promise settles. */
export async function authenticateSandbox({ clientId, clientSecret, fetchImpl = fetch }) {
  return createPayPalClient({ clientId, clientSecret, fetchImpl }).authenticate();
}
