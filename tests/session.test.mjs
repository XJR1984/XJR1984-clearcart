import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../lib/app.mjs';

// Simulated OAuth/order responses only. No real sandbox account is used here.
const ORIGIN = 'https://clearcart.example';
const TOKEN = 'session-fixture-access-token';
const SECRET = 'sandbox-client-secret-fixture';
const credentials = { clientId: 'sandbox-client-fixture', clientSecret: SECRET };
const cart = { items: [{ id: 'study-notebook', quantity: 1 }], budgetCents: 1000, requestId: '76fe5628-7230-4436-ac49-0d09170a70fa' };

function fixture({ token = TOKEN, expiresIn = 3600, authError = false, apiError = false } = {}) {
  const calls = [];
  const orders = new Map();
  const app = createApp({ fetchImpl: async (url, init) => {
    calls.push({ url, ...init });
    assert.equal(new URL(url).origin, 'https://api-m.sandbox.paypal.com');
    assert.equal(init.redirect, 'error');
    if (url.endsWith('/v1/oauth2/token')) {
      if (authError) return Response.json({ error: SECRET }, { status: 401 });
      return Response.json({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' });
    }
    if (apiError) return Response.json({ error: TOKEN }, { status: 401 });
    if (url.endsWith('/v2/checkout/orders')) {
      const payload = JSON.parse(init.body);
      const id = `ORDER${orders.size + 1}`;
      const order = { id, intent: 'CAPTURE', status: 'APPROVED', purchase_units: payload.purchase_units, links: [{ rel: 'payer-action', href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}` }] };
      orders.set(id, order);
      return Response.json(order);
    }
    const match = url.match(/\/orders\/([A-Za-z0-9]+)(\/capture)?$/);
    const order = orders.get(match?.[1]);
    assert.ok(order, 'fixture order exists');
    if (match[2]) {
      order.status = 'COMPLETED';
      order.purchase_units[0].payments = { captures: [{ id: 'CAPTURE1', status: 'COMPLETED', amount: order.purchase_units[0].amount }] };
    }
    return Response.json(order);
  } });
  async function request(path, body, { origin = ORIGIN, cookie, originHeader = origin, env = {}, headers = {} } = {}) {
    const requestHeaders = new Headers(headers);
    if (body !== undefined) {
      requestHeaders.set('Content-Type', 'application/json');
      if (originHeader !== null) requestHeaders.set('Origin', originHeader);
    }
    if (cookie) requestHeaders.set('Cookie', cookie);
    const response = await app.fetch(new Request(`${origin}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: requestHeaders, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
    const text = await response.text();
    return { response, text, data: JSON.parse(text), status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  return { app, request, calls };
}

test('connect exchanges credentials once and returns only non-sensitive session metadata', async () => {
  const f = fixture();
  const result = await f.request('/api/paypal/connect', credentials);
  assert.equal(result.status, 200);
  assert.equal(result.data.connected, true);
  assert.equal(result.data.mode, 'sandbox');
  assert.ok(result.data.expiresIn >= 3538 && result.data.expiresIn <= 3540);
  assert.doesNotMatch(result.text, new RegExp(`${SECRET}|${TOKEN}|sandbox-client-fixture`));
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].headers.Authorization, `Basic ${btoa(`${credentials.clientId}:${SECRET}`)}`);
  assert.equal(f.calls[0].body, 'grant_type=client_credentials');
  const cookie = result.response.headers.get('set-cookie');
  assert.match(cookie, /^__Host-clearcart-paypal=/);
  for (const flag of ['; Secure', '; HttpOnly', '; SameSite=Lax', '; Path=/']) assert.ok(cookie.includes(flag), flag);
  assert.doesNotMatch(cookie, /Domain=|sandbox-client-secret/);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
});

test('cookie lifetime is capped at one hour and never exceeds remaining provider lifetime', async () => {
  const long = await fixture({ expiresIn: 30_000 }).request('/api/paypal/connect', credentials);
  assert.equal(long.data.expiresIn, 3600);
  assert.match(long.response.headers.get('set-cookie'), /Max-Age=3600/);
  const short = await fixture({ expiresIn: 90 }).request('/api/paypal/connect', credentials);
  assert.ok(short.data.expiresIn >= 28 && short.data.expiresIn <= 30);
  const tooShort = await fixture({ expiresIn: 60 }).request('/api/paypal/connect', credentials);
  assert.equal(tooShort.status, 502);
  assert.equal(tooShort.data.code, 'SESSION_TOO_SHORT');
  assert.equal(tooShort.response.headers.get('set-cookie'), null);
});

test('loopback development uses HttpOnly local cookie; insecure nonlocal hosts cannot connect', async () => {
  const f = fixture();
  const local = await f.request('/api/paypal/connect', credentials, { origin: 'http://127.0.0.1:3000' });
  assert.equal(local.status, 200);
  assert.match(local.response.headers.get('set-cookie'), /^clearcart-paypal=/);
  assert.match(local.response.headers.get('set-cookie'), /HttpOnly/);
  assert.doesNotMatch(local.response.headers.get('set-cookie'), /Secure/);
  const before = f.calls.length;
  const nonlocal = await f.request('/api/paypal/connect', credentials, { origin: 'http://public.example' });
  assert.equal(nonlocal.status, 403);
  assert.equal(f.calls.length, before);
  const config = await f.request('/api/config', undefined, { origin: 'http://public.example', cookie: `clearcart-paypal=${TOKEN}` });
  assert.equal(config.data.sessionSetupAvailable, false);
  assert.equal(config.data.paypalConfigured, false);
});

test('connection management requires same-origin browser requests before exchanging secrets', async () => {
  const f = fixture();
  for (const path of ['/api/paypal/connect', '/api/paypal/disconnect']) {
    for (const options of [{ originHeader: null }, { originHeader: 'https://other.example' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } }]) {
      assert.equal((await f.request(path, credentials, options)).status, 403);
    }
  }
  assert.equal(f.calls.length, 0);
});

test('invalid credentials and malformed provider tokens fail without exposing secret values', async () => {
  const f = fixture();
  for (const input of [{}, { ...credentials, clientId: 'id:other' }, { ...credentials, clientSecret: '\r\ninjected' }, { ...credentials, clientSecret: 'a'.repeat(513) }]) {
    const result = await f.request('/api/paypal/connect', input);
    assert.equal(result.status, 503);
    assert.equal(result.response.headers.get('set-cookie'), null);
    assert.doesNotMatch(result.text, /injected|sandbox-client-secret/);
  }
  assert.equal(f.calls.length, 0);
  for (const options of [{ authError: true }, { token: 'bad token; Secure' }, { token: '+'.repeat(2500) }]) {
    const result = await fixture(options).request('/api/paypal/connect', credentials);
    assert.equal(result.status, 502);
    assert.equal(result.response.headers.get('set-cookie'), null);
    assert.doesNotMatch(result.text, /sandbox-client-secret|bad token/);
  }
});

test('config identifies token presence without exposing it or performing a verification call', async () => {
  const f = fixture();
  const empty = await f.request('/api/config');
  assert.equal(empty.data.connectionMode, 'unconfigured');
  assert.equal(empty.data.sessionSetupAvailable, true);
  const config = await f.request('/api/config', undefined, { cookie: `__Host-clearcart-paypal=${TOKEN}` });
  assert.equal(config.data.connectionMode, 'browser_session');
  assert.equal(config.data.paypalConfigured, true);
  assert.doesNotMatch(config.text, new RegExp(TOKEN));
  assert.equal(f.calls.length, 0);
});

test('browser session completes create and capture without storing or reusing the client secret', async () => {
  const f = fixture();
  const connected = await f.request('/api/paypal/connect', credentials);
  const created = await f.request('/api/orders', cart, { cookie: connected.cookie });
  assert.equal(created.status, 201);
  const captured = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state }, { cookie: connected.cookie });
  assert.equal(captured.status, 200);
  assert.equal(captured.data.status, 'COMPLETED');
  assert.equal(f.calls.filter(call => call.url.endsWith('/oauth2/token')).length, 1);
  for (const call of f.calls.slice(1)) assert.equal(call.headers.Authorization, `Bearer ${TOKEN}`);
  assert.doesNotMatch(created.text + captured.text, new RegExp(`${TOKEN}|${SECRET}`));
});

test('checkout state is bound to the browser token and rejects another session before upstream access', async () => {
  const f = fixture();
  const cookieA = `__Host-clearcart-paypal=${TOKEN}`;
  const cookieB = '__Host-clearcart-paypal=other-session-access-token';
  const created = await f.request('/api/orders', cart, { cookie: cookieA });
  assert.equal(created.status, 201);
  const before = f.calls.length;
  const swapped = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state }, { cookie: cookieB });
  assert.equal(swapped.status, 400);
  assert.equal(swapped.data.code, 'INVALID_CHECKOUT');
  assert.equal(f.calls.length, before);
});

test('server credentials remain preferred and are not replaced by a browser cookie', async () => {
  const f = fixture();
  const env = { PAYPAL_CLIENT_ID: 'server-client', PAYPAL_CLIENT_SECRET: 'server-secret' };
  const options = { cookie: '__Host-clearcart-paypal=other-browser-token', env };
  const config = await f.request('/api/config', undefined, options);
  assert.equal(config.data.connectionMode, 'server');
  const created = await f.request('/api/orders', cart, options);
  assert.equal(created.status, 201);
  assert.equal(f.calls[0].headers.Authorization, `Basic ${btoa('server-client:server-secret')}`);
});

test('invalid or duplicate session cookies are rejected and cleared without contacting PayPal', async () => {
  const f = fixture();
  for (const cookie of ['__Host-clearcart-paypal=%ZZ', '__Host-clearcart-paypal=bad%0D%0Aheader', `__Host-clearcart-paypal=${TOKEN}; __Host-clearcart-paypal=${TOKEN}`, `__Host-clearcart-paypal=${'a'.repeat(9000)}`]) {
    const result = await f.request('/api/config', undefined, { cookie });
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'INVALID_SESSION');
    assert.match(result.response.headers.get('set-cookie'), /Max-Age=0/);
  }
  assert.equal(f.calls.length, 0);
});

test('expired upstream token clears the cookie and asks for reconnection without leaking response data', async () => {
  const f = fixture({ apiError: true });
  const result = await f.request('/api/orders', cart, { cookie: `__Host-clearcart-paypal=${TOKEN}` });
  assert.equal(result.status, 401);
  assert.equal(result.data.code, 'PAYPAL_SESSION_EXPIRED');
  assert.match(result.response.headers.get('set-cookie'), /Max-Age=0/);
  assert.doesNotMatch(result.text, new RegExp(TOKEN));
  assert.equal(f.calls.length, 1);
});

test('disconnect clears the browser token without an upstream request and leaves server configuration intact', async () => {
  const f = fixture();
  const result = await f.request('/api/paypal/disconnect', {}, { cookie: `__Host-clearcart-paypal=${TOKEN}` });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { connected: false, mode: 'sandbox' });
  assert.equal(result.response.headers.get('set-cookie'), '__Host-clearcart-paypal=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
  assert.equal(f.calls.length, 0);
});
