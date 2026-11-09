import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../lib/app.mjs';
import { getProductById } from '../lib/catalog.mjs';

// Every upstream response below is simulated. These tests make no network calls
// and are not evidence of a genuine PayPal sandbox buyer approval or capture.
const ORIGIN = 'https://clearcart.example';
const ENV = { PAYPAL_CLIENT_ID: 'fixture-client', PAYPAL_CLIENT_SECRET: 'fixture-secret-not-real' };
const REQUEST_ID = '76fe5628-7230-4436-ac49-0d09170a70fa';
const newCart = () => ({ items: [{ id: 'study-notebook', quantity: 1 }], budgetCents: 2000, requestId: REQUEST_ID });
const clone = value => structuredClone(value);

function fixture(options = {}) {
  const calls = [];
  const orders = new Map();
  const createKeys = new Map();
  let clock = 1_800_000_000_000;
  const control = { getTransform: x => x, createTransform: x => x, captureTransform: x => x, captureStatus: 'COMPLETED' };
  const fetchImpl = async (url, init) => {
    calls.push({ url, ...init });
    assert.equal(new URL(url).origin, 'https://api-m.sandbox.paypal.com');
    if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'fixture-token', expires_in: 3600, token_type: 'Bearer' });
    if (url.endsWith('/v2/checkout/orders') && init.method === 'POST') {
      const body = JSON.parse(init.body);
      const key = init.headers['PayPal-Request-Id'];
      let id = createKeys.get(key);
      if (!id) {
        id = `TESTORDER${orders.size + 1}`;
        createKeys.set(key, id);
        orders.set(id, { id, intent: body.intent, status: 'PAYER_ACTION_REQUIRED', purchase_units: clone(body.purchase_units), links: [{ rel: 'payer-action', href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}` }] });
      }
      return Response.json(control.createTransform(clone(orders.get(id))));
    }
    const match = new URL(url).pathname.match(/^\/v2\/checkout\/orders\/([A-Za-z0-9]+)(\/capture)?$/);
    assert.ok(match, `Unexpected fixture route: ${url}`);
    const order = orders.get(match[1]);
    assert.ok(order, 'Unknown fixture order');
    if (init.method === 'GET' && !match[2]) return Response.json(control.getTransform(clone(order)));
    assert.equal(init.method, 'POST');
    assert.equal(match[2], '/capture');
    order.status = 'COMPLETED';
    order.purchase_units[0].payments = { captures: [{ id: `CAPTURE${order.id}`, status: control.captureStatus, amount: clone(order.purchase_units[0].amount) }] };
    return Response.json(control.captureTransform(clone(order)));
  };
  const app = createApp({ fetchImpl, now: () => clock, ...options });
  async function request(path, body, { method = body === undefined ? 'GET' : 'POST', headers = {}, env = ENV } = {}) {
    const response = await app.fetch(new Request(`${ORIGIN}${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: ORIGIN }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { response, data, text, status: response.status };
  }
  return { app, request, calls, orders, control, advance: ms => { clock += ms; } };
}

test('planning and configuration work without credentials while checkout is unavailable', async () => {
  const f = fixture();
  const config = await f.request('/api/config', undefined, { env: {} });
  assert.equal(config.status, 200);
  assert.equal(config.data.paypalConfigured, false);
  assert.equal(config.data.mode, 'sandbox');
  const plan = await f.request('/api/plan', { need: 'Set up a study desk for homework and notes', budgetCents: 2000 }, { env: {} });
  assert.equal(plan.status, 200);
  assert.ok(plan.data.items.length > 0);
  assert.ok(plan.data.totalCents <= 2000);
  const order = await f.request('/api/orders', newCart(), { env: {} });
  assert.equal(order.status, 503);
  assert.equal(order.data.code, 'PAYPAL_NOT_CONFIGURED');
  assert.equal(f.calls.length, 0);
});

test('cross-origin and cross-site requests are rejected before upstream calls', async () => {
  const f = fixture();
  for (const headers of [{ Origin: 'https://other.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    const result = await f.request('/api/orders', newCart(), { headers });
    assert.equal(result.status, 403);
  }
  assert.equal(f.calls.length, 0);
});

test('server catalog prices and names override client-supplied values', async () => {
  const f = fixture();
  const input = newCart();
  input.items[0] = { ...input.items[0], priceCents: 1, name: 'tampered product', amount: '0.01' };
  const result = await f.request('/api/orders', input);
  assert.equal(result.status, 201);
  assert.equal(result.data.totalCents, getProductById('study-notebook').priceCents);
  assert.ok(result.data.state.includes('.'));
  assert.match(result.data.approvalUrl, /^https:\/\/www\.sandbox\.paypal\.com\//);
  const sent = JSON.parse(f.calls.find(call => call.url.endsWith('/v2/checkout/orders')).body);
  assert.equal(sent.purchase_units[0].amount.value, '5.99');
  assert.equal(sent.purchase_units[0].items[0].unit_amount.value, '5.99');
  assert.equal(sent.purchase_units[0].items[0].name, 'Notebook and pen pack');
  assert.match(sent.purchase_units[0].custom_id, /^clearcart-[A-Za-z0-9_-]+$/);
  assert.equal(sent.payment_source.paypal.experience_context.return_url, `${ORIGIN}/?checkout=return`);
  assert.equal(sent.payment_source.paypal.experience_context.cancel_url, `${ORIGIN}/?canceled=1`);
});

test('invalid carts and over-budget purchases fail without touching PayPal', async () => {
  const f = fixture();
  const invalid = [
    { ...newCart(), budgetCents: 598 },
    { ...newCart(), budgetCents: 0 },
    { ...newCart(), budgetCents: 2000.5 },
    { ...newCart(), budgetCents: 1_000_001 },
    { ...newCart(), items: [] },
    { ...newCart(), items: [{ id: 'invented', quantity: 1 }] },
    { ...newCart(), items: [{ id: 'study-notebook', quantity: 0 }] },
    { ...newCart(), items: [{ id: 'study-notebook', quantity: 6 }] },
    { ...newCart(), items: [{ id: 'study-notebook', quantity: 1.5 }] },
    { ...newCart(), items: [{ id: 'study-notebook', quantity: '1' }] },
    { ...newCart(), items: [newCart().items[0], newCart().items[0]] },
    { ...newCart(), requestId: 'not-a-uuid' },
  ];
  for (const input of invalid) assert.equal((await f.request('/api/orders', input)).status, 400);
  assert.equal(f.calls.length, 0);
});

test('create retries reuse one idempotency key and changed carts get another', async () => {
  const f = fixture();
  const first = await f.request('/api/orders', newCart());
  const second = await f.request('/api/orders', newCart());
  const third = await f.request('/api/orders', { ...newCart(), items: [{ id: 'study-notebook', quantity: 2 }] });
  assert.equal(first.status, 201); assert.equal(second.status, 201); assert.equal(third.status, 201);
  assert.equal(first.data.id, second.data.id);
  assert.notEqual(first.data.id, third.data.id);
  const creates = f.calls.filter(call => call.url.endsWith('/v2/checkout/orders'));
  assert.equal(creates[0].headers['PayPal-Request-Id'], creates[1].headers['PayPal-Request-Id']);
  assert.notEqual(creates[0].headers['PayPal-Request-Id'], creates[2].headers['PayPal-Request-Id']);
  assert.equal(creates[0].body, creates[1].body);
});

test('buyer approval and completed capture return only the verified receipt', async () => {
  const f = fixture();
  const created = await f.request('/api/orders', newCart());
  f.orders.get(created.data.id).status = 'APPROVED';
  const captured = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
  assert.equal(captured.status, 200);
  assert.deepEqual(captured.data, { id: created.data.id, status: 'COMPLETED', captureId: `CAPTURE${created.data.id}`, totalCents: 599, currency: 'USD', mode: 'sandbox' });
  assert.equal(f.calls.filter(call => call.url.endsWith('/capture')).length, 1);
  assert.doesNotMatch(captured.text, /fixture-secret|fixture-token/);
});

test('a repeated capture reads the completed order and never captures twice', async () => {
  const f = fixture();
  const created = await f.request('/api/orders', newCart());
  f.orders.get(created.data.id).status = 'APPROVED';
  const first = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
  const retry = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
  assert.equal(first.status, 200);
  assert.equal(retry.status, 200);
  assert.deepEqual(first.data, retry.data);
  assert.equal(f.calls.filter(call => call.url.endsWith('/capture')).length, 1);
});

test('unapproved orders cannot be captured', async () => {
  const f = fixture();
  const created = await f.request('/api/orders', newCart());
  const result = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
  assert.equal(result.status, 409);
  assert.equal(result.data.code, 'APPROVAL_REQUIRED');
  assert.equal(f.calls.filter(call => call.url.endsWith('/capture')).length, 0);
});

test('mismatched amounts, currencies, and checkout references are rejected before capture', async () => {
  const f = fixture();
  const created = await f.request('/api/orders', newCart());
  f.orders.get(created.data.id).status = 'APPROVED';
  for (const transform of [
    order => { order.purchase_units[0].amount.value = '0.01'; return order; },
    order => { order.purchase_units[0].amount.currency_code = 'EUR'; return order; },
    order => { order.purchase_units[0].custom_id = 'different-cart'; return order; },
    order => { order.id = 'ANOTHERORDER'; return order; },
    order => { order.intent = 'AUTHORIZE'; return order; },
  ]) {
    f.control.getTransform = transform;
    const result = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
    assert.equal(result.status, 502);
    assert.equal(result.data.code, 'ORDER_MISMATCH');
  }
  assert.equal(f.calls.filter(call => call.url.endsWith('/capture')).length, 0);
});

test('tampered, missing, wrong-order, and expired state never reach PayPal', async () => {
  const f = fixture();
  const created = await f.request('/api/orders', newCart());
  const callsAfterCreate = f.calls.length;
  const [payload, signature] = created.data.state.split('.');
  const altered = `${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  for (const state of [undefined, '', 'invalid', altered]) {
    const result = await f.request(`/api/orders/${created.data.id}/capture`, { state });
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'INVALID_CHECKOUT');
  }
  assert.equal((await f.request('/api/orders/WRONGORDER/capture', { state: created.data.state })).status, 400);
  f.advance(60 * 60 * 1000 + 1);
  const expired = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
  assert.equal(expired.status, 400);
  assert.equal(expired.data.code, 'INVALID_CHECKOUT');
  assert.equal(f.calls.length, callsAfterCreate);
});

test('pending capture is never represented as successful payment', async () => {
  const f = fixture();
  f.control.captureStatus = 'PENDING';
  const created = await f.request('/api/orders', newCart());
  f.orders.get(created.data.id).status = 'APPROVED';
  const result = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
  assert.equal(result.status, 409);
  assert.equal(result.data.code, 'CAPTURE_NOT_COMPLETED');
  assert.notEqual(result.data.status, 'COMPLETED');
});

test('a completed status alone cannot hide a wrong captured amount or missing capture', async () => {
  for (const transform of [
    order => { order.purchase_units[0].payments.captures[0].amount.value = '0.01'; return order; },
    order => { order.purchase_units[0].payments.captures = []; return order; },
    order => { order.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'; return order; },
  ]) {
    const f = fixture();
    const created = await f.request('/api/orders', newCart());
    f.orders.get(created.data.id).status = 'APPROVED';
    f.control.captureTransform = transform;
    const result = await f.request(`/api/orders/${created.data.id}/capture`, { state: created.data.state });
    assert.equal(result.status, 409);
    assert.equal(result.data.code, 'CAPTURE_NOT_COMPLETED');
    assert.notEqual(result.data.status, 'COMPLETED');
  }
});

test('unexpected approval hosts and mismatched create responses are rejected', async () => {
  const f = fixture();
  for (const transform of [
    order => { order.links[0].href = 'https://attacker.example/'; return order; },
    order => { order.links[0].href = 'http://www.sandbox.paypal.com/'; return order; },
    order => { order.purchase_units[0].amount.value = '999.00'; return order; },
  ]) {
    f.control.createTransform = transform;
    const result = await f.request('/api/orders', newCart());
    assert.equal(result.status, 502);
    assert.equal(result.data.state, undefined);
    assert.equal(result.data.approvalUrl, undefined);
  }
});

test('JSON type, malformed body, and size limits fail cleanly without upstream requests', async () => {
  const f = fixture();
  assert.equal((await f.request('/api/plan', {}, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.request('/api/plan', null)).status, 400);
  assert.equal((await f.request('/api/plan', [])).status, 400);
  assert.equal((await f.request('/api/plan', { need: 'a'.repeat(17_000) })).status, 413);
  assert.equal((await f.request('/api/plan', {}, { headers: { 'Content-Length': '17000' } })).status, 413);
  const malformed = await f.app.fetch(new Request(`${ORIGIN}/api/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }), ENV);
  assert.equal(malformed.status, 400);
  assert.equal(f.calls.length, 0);
});

test('static assets, catalog, health, missing routes, and method handling', async () => {
  const f = fixture({ assets: { '/': { body: '<h1>ClearCart</h1>', type: 'text/html; charset=utf-8' }, '/app.js': { body: 'console.log("demo")', type: 'text/javascript' } } });
  const page = await f.request('/');
  assert.equal(page.status, 200);
  assert.equal(page.data, '<h1>ClearCart</h1>');
  assert.equal(page.response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(page.response.headers.get('x-content-type-options'), 'nosniff');
  const head = await f.request('/', undefined, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.text, '');
  assert.equal((await f.request('/app.js')).status, 200);
  const catalog = await f.request('/api/catalog');
  assert.equal(catalog.status, 200);
  assert.equal(catalog.data.items.length, 32);
  assert.equal((await f.request('/api/health')).data.status, 'ok');
  assert.equal((await f.request('/missing')).status, 404);
  assert.equal((await f.request('/api/missing', {})).status, 404);
  assert.equal((await f.request('/api/health', undefined, { method: 'PUT' })).status, 405);
  assert.equal(f.calls.length, 0);
});
