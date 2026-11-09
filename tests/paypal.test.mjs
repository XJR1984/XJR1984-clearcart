import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayPalClient, PayPalError } from '../lib/paypal.mjs';

const CREATE_ID = '76fe5628-7230-4436-ac49-0d09170a70fa';
const CAPTURE_ID = 'a7939ee9-7eb1-44fb-a40a-ebc747a0595c';
const ORDER_ID = '5O190127TN364715T';
const AUTH = { access_token: 'test-token-never-real', expires_in: 3600, token_type: 'Bearer' };
const cart = () => ({
  items: [{ id: 'lamp', name: 'Demo lamp', priceCents: 1999, quantity: 2 }, { id: 'pen', name: 'Demo pen', priceCents: 101, quantity: 1 }],
  totalCents: 4099,
  requestId: CREATE_ID,
  returnUrl: 'https://clearcart.example/?checkout=return',
  cancelUrl: 'https://clearcart.example/?canceled=1',
  customId: 'clearcart-checkout-reference',
});

function fakeClient(responses) {
  const calls = [];
  const client = createPayPalClient({
    clientId: 'test-client', clientSecret: 'sensitive-test-secret',
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      const result = responses.shift();
      assert.ok(result, 'unexpected fetch');
      if (result instanceof Error) throw result;
      if (result instanceof Response) return result;
      return Response.json(result);
    },
  });
  return { client, calls };
}

test('sandbox OAuth, line item arithmetic, approval context, GET and capture', async () => {
  const completed = { id: ORDER_ID, status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: '40.99' } }] } }] };
  const { client, calls } = fakeClient([AUTH, { id: ORDER_ID, status: 'PAYER_ACTION_REQUIRED' }, { id: ORDER_ID, status: 'APPROVED' }, completed]);
  await client.createOrder(cart());
  await client.getOrder(ORDER_ID);
  assert.deepEqual(await client.captureOrder(ORDER_ID, CAPTURE_ID), completed);
  assert.equal(calls.length, 4, 'one OAuth request cached across the workflow');
  for (const call of calls) {
    assert.equal(new URL(call.url).origin, 'https://api-m.sandbox.paypal.com');
    assert.equal(call.redirect, 'error');
    assert.ok(call.signal instanceof AbortSignal);
  }
  assert.equal(calls[0].body, 'grant_type=client_credentials');
  assert.equal(calls[0].headers.Authorization, `Basic ${btoa('test-client:sensitive-test-secret')}`);
  const payload = JSON.parse(calls[1].body);
  assert.equal(payload.intent, 'CAPTURE');
  assert.deepEqual(payload.purchase_units[0].amount, { currency_code: 'USD', value: '40.99', breakdown: { item_total: { currency_code: 'USD', value: '40.99' } } });
  assert.equal(payload.purchase_units[0].items[0].quantity, '2');
  assert.equal(payload.purchase_units[0].items[0].unit_amount.value, '19.99');
  assert.equal(payload.payment_source.paypal.experience_context.shipping_preference, 'NO_SHIPPING');
  assert.equal(payload.payment_source.paypal.experience_context.user_action, 'PAY_NOW');
  assert.equal(calls[1].headers['PayPal-Request-Id'], CREATE_ID);
  assert.equal(calls[2].method, 'GET');
  assert.equal(calls[2].body, undefined);
  assert.equal(calls[3].headers['PayPal-Request-Id'], CAPTURE_ID);
  assert.equal(calls[3].body, '{}');
});

test('retries preserve the caller request ID instead of generating another payment', async () => {
  const { client, calls } = fakeClient([AUTH, new Error('network failed with sensitive-test-secret'), { id: ORDER_ID }]);
  await assert.rejects(client.createOrder(cart()), { code: 'PAYPAL_UNAVAILABLE' });
  await client.createOrder(cart());
  assert.equal(calls[1].headers['PayPal-Request-Id'], calls[2].headers['PayPal-Request-Id']);
  assert.equal(calls[1].body, calls[2].body);
});

test('rejects tampered arithmetic, invalid quantity, duplicate SKU and malformed money before network', async () => {
  const { client, calls } = fakeClient([]);
  const invalidCarts = [
    { ...cart(), totalCents: 1 },
    { ...cart(), totalCents: 4099.5 },
    { ...cart(), totalCents: NaN },
    { ...cart(), items: [] },
    { ...cart(), items: [{ ...cart().items[0], quantity: 0 }] },
    { ...cart(), items: [{ ...cart().items[0], priceCents: -1 }] },
    { ...cart(), items: [cart().items[0], cart().items[0]] },
    { ...cart(), requestId: 'not-a-uuid' },
    { ...cart(), customId: '\n' },
  ];
  for (const value of invalidCarts) await assert.rejects(client.createOrder(value), { code: 'INVALID_INPUT', status: 400 });
  assert.equal(calls.length, 0);
});

test('order IDs cannot alter the URL path, host or query', async () => {
  const { client, calls } = fakeClient([]);
  for (const id of ['../orders', 'id?x=y', 'https://elsewhere.example', '%2f', '', 'A'.repeat(37), undefined]) {
    await assert.rejects(client.getOrder(id), { code: 'INVALID_INPUT' });
    await assert.rejects(client.captureOrder(id, CAPTURE_ID), { code: 'INVALID_INPUT' });
  }
  await assert.rejects(client.captureOrder(ORDER_ID, 'new-id'), { code: 'INVALID_INPUT' });
  assert.equal(calls.length, 0);
});

test('return URLs require HTTPS or explicit loopback HTTP and share one origin', async () => {
  const { client, calls } = fakeClient([AUTH, { id: ORDER_ID }]);
  for (const returnUrl of ['javascript:alert(1)', 'http://untrusted.example', 'https://user:password@example.com', 'https://clearcart.example/#fragment']) {
    await assert.rejects(client.createOrder({ ...cart(), returnUrl }), { code: 'INVALID_INPUT' });
  }
  await assert.rejects(client.createOrder({ ...cart(), cancelUrl: 'https://another.example/' }), { code: 'INVALID_INPUT' });
  assert.equal(calls.length, 0);
  await client.createOrder({ ...cart(), returnUrl: 'http://127.0.0.1:3000/', cancelUrl: 'http://127.0.0.1:3000/?canceled=1' });
  assert.equal(calls.length, 2);
});

test('authentication and API errors never expose raw bodies or secrets', async () => {
  for (const responses of [
    [Response.json({ error: 'sensitive-test-secret test-token-never-real' }, { status: 401 })],
    [AUTH, Response.json({ debug: 'sensitive-test-secret test-token-never-real' }, { status: 422 })],
    [AUTH, new Error('sensitive-test-secret test-token-never-real')],
    [AUTH, new Response('sensitive-test-secret test-token-never-real')],
  ]) {
    const { client } = fakeClient(responses);
    await assert.rejects(client.createOrder(cart()), error => {
      assert.ok(error instanceof PayPalError);
      assert.doesNotMatch(`${error.stack} ${JSON.stringify(error)}`, /sensitive-test-secret|test-token-never-real/);
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test('invalid OAuth responses are rejected and future calls can retry authentication', async () => {
  const { client, calls } = fakeClient([{ access_token: 'not-enough' }, AUTH, { id: ORDER_ID }]);
  await assert.rejects(client.getOrder(ORDER_ID), { code: 'PAYPAL_INVALID_RESPONSE' });
  await client.getOrder(ORDER_ID);
  assert.equal(calls.filter(call => call.url.endsWith('/oauth2/token')).length, 2);
});

test('concurrent requests share one OAuth acquisition', async () => {
  let oauthCalls = 0;
  let orderCalls = 0;
  const client = createPayPalClient({ clientId: 'test', clientSecret: 'secret', fetchImpl: async url => {
    if (url.endsWith('/oauth2/token')) { oauthCalls++; await Promise.resolve(); return Response.json(AUTH); }
    orderCalls++;
    return Response.json({ id: ORDER_ID });
  } });
  await Promise.all([client.getOrder(ORDER_ID), client.getOrder(ORDER_ID), client.getOrder(ORDER_ID)]);
  assert.equal(oauthCalls, 1);
  assert.equal(orderCalls, 3);
});

test('unconfigured credentials fail before any fetch', () => {
  for (const config of [{}, { clientId: 'x' }, { clientId: 'x', clientSecret: ' ' }]) {
    assert.throws(() => createPayPalClient(config), { code: 'PAYPAL_NOT_CONFIGURED', status: 503 });
  }
});
