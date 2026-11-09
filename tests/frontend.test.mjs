import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => {resolve=r;}); return {promise,resolve}; };

// A small event/DOM fixture exercises async UI behavior without claiming browser QA.
class Element {
  constructor() {
    this.listeners = {}; this.children = []; this.value = ''; this.textContent = '';
    this.disabled = false; this.attributes = {};
    const classes = new Set();
    this.classList = {add:(s)=>classes.add(s), remove:(s)=>classes.delete(s), toggle:(s,on)=>on ? classes.add(s) : classes.delete(s)};
    this.style = {};
  }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() {} scrollIntoView() {} remove() {} click() {}
}

async function setup({handler} = {}) {
  const elements = new Map();
  const element = selector => { if (!elements.has(selector)) elements.set(selector,new Element()); return elements.get(selector); };
  const pendingPlan = deferred(); const pendingOrder = deferred();
  const stored = new Map(); let redirected = null;
  const document = {querySelector:element, querySelectorAll:()=>[], createElement:()=>new Element(), body:new Element()};
  const window = {location:{search:'',pathname:'/',assign:url=>{redirected=url;}},matchMedia:()=>({matches:false})};
  const fetch = async (path,options) => {
    if (handler) { const handled = await handler(path,options); if(handled) return handled; }
    return {ok:true, json:async()=>path==='/api/config' ? {paypalConfigured:true} : path==='/api/catalog' ? {items:[]} : path==='/api/plan' ? pendingPlan.promise : pendingOrder.promise};
  };
  const context = vm.createContext({document,window,fetch,Intl,URL,URLSearchParams,Blob,setTimeout,crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'},sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},history:{replaceState(){}}});
  vm.runInContext(source, context);
  await flush();
  element('#need').value = 'Set up a study desk for my classes';
  element('#budget').value = '20';
  return {element,pendingPlan,pendingOrder,stored,get redirected(){return redirected;}};
}

const plan = {items:[{id:'study-cards',name:'Revision cards and pen',priceCents:399,quantity:1,reason:'Notes'}],totalCents:399,budgetCents:2000,remainingCents:1601,intent:{label:'study',confidence:0.95,method:'Multinomial Naive Bayes'},warnings:[],missingNeeds:[]};

test('editing while a plan is loading keeps the returned cart stale', async () => {
  const ui = await setup();
  const submitting = ui.element('#plan-form').listeners.submit({preventDefault(){}});
  ui.element('#budget').value = '3';
  ui.element('#budget').listeners.input();
  ui.pendingPlan.resolve(plan);
  await submitting;
  assert.equal(ui.element('#checkout-button').disabled,true);
  assert.match(ui.element('#form-message').textContent,/inputs changed/);
  assert.match(ui.element('#checkout-message').textContent,/Make a new plan/);
});

test('editing while checkout is loading does not redirect to the old order', async () => {
  const ui = await setup();
  const submitting = ui.element('#plan-form').listeners.submit({preventDefault(){}});
  ui.pendingPlan.resolve(plan); await submitting;
  assert.equal(ui.element('#checkout-button').disabled,false);
  const checkout = ui.element('#checkout-button').listeners.click();
  ui.element('#need').value = 'I need portable lighting for an outage';
  ui.element('#need').listeners.input();
  ui.pendingOrder.resolve({id:'ORDER123',state:'signed-state',approvalUrl:'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123'});
  await checkout;
  assert.equal(ui.redirected,null);
  assert.equal(ui.stored.size,0);
  assert.equal(ui.element('#checkout-button').disabled,true);
  assert.match(ui.element('#checkout-message').textContent,/changed during checkout/);
});

test('accepted intent uses an uncalibrated score instead of a percentage', async () => {
  const ui = await setup();
  const submitting = ui.element('#plan-form').listeners.submit({preventDefault(){}});
  ui.pendingPlan.resolve(plan); await submitting;
  assert.equal(ui.element('#intent-confidence').textContent,'0.95');
  assert.match(ui.element('.intent-score').title,/not calibrated/);
});

test('sandbox connection clears credentials immediately and does not put them in browser storage', async () => {
  const pending = deferred(); let connected = false; let submitted;
  const ui = await setup({handler: async (path,options) => {
    if(path === '/api/config') return {ok:true,json:async()=>({paypalConfigured:connected,connectionMode:connected?'browser_session':'unconfigured'})};
    if(path === '/api/paypal/connect') {submitted=JSON.parse(options.body);return pending.promise;}
  }});
  ui.element('#sandbox-client-id').value = 'fake-client';
  ui.element('#sandbox-client-secret').value = 'fake-secret';
  ui.stored.set('clearcart-checkout','old-checkout');
  const connecting = ui.element('#connect-form').listeners.submit({preventDefault(){}});
  assert.equal(ui.element('#sandbox-client-secret').value,'');
  assert.equal(ui.element('#sandbox-client-id').value,'');
  assert.equal(ui.element('#sandbox-client-secret').disabled,true);
  assert.deepEqual(submitted,{clientId:'fake-client',clientSecret:'fake-secret'});
  connected=true; pending.resolve({ok:true,json:async()=>({connected:true,expiresIn:3600,mode:'sandbox'})});
  await connecting;
  assert.equal(ui.stored.size,0);
  assert.equal(ui.element('#sandbox-client-secret').disabled,false);
  assert.equal(ui.element('#connection-status').textContent,'Connected for this browser');
  assert.doesNotMatch(ui.element('#connection-message').textContent,/fake-secret|fake-client/);
});

test('failed sandbox authentication keeps the app disconnected with empty credential fields', async () => {
  const ui = await setup({handler: async path => {
    if(path==='/api/config') return {ok:true,json:async()=>({paypalConfigured:false,connectionMode:'unconfigured'})};
    if(path==='/api/paypal/connect') return {ok:false,json:async()=>({error:'PayPal sandbox authentication failed.',code:'PAYPAL_AUTH_FAILED'})};
  }});
  ui.element('#sandbox-client-id').value='fake-client'; ui.element('#sandbox-client-secret').value='fake-secret';
  await ui.element('#connect-form').listeners.submit({preventDefault(){}});
  assert.equal(ui.element('#sandbox-client-secret').value,'');
  assert.equal(ui.element('#sandbox-setup').open,true);
  assert.equal(ui.element('#connection-status').textContent,'Not connected');
  assert.equal(ui.element('#checkout-button').disabled,true);
  assert.equal(ui.stored.size,0);
  assert.match(ui.element('#connection-message').textContent,/authentication failed/);
});

test('blocked connection cookies never produce a connected success message', async () => {
  const ui = await setup({handler: async path => {
    if(path==='/api/config') return {ok:true,json:async()=>({paypalConfigured:false,connectionMode:'unconfigured'})};
    if(path==='/api/paypal/connect') return {ok:true,json:async()=>({connected:true,expiresIn:3600,mode:'sandbox'})};
  }});
  ui.element('#sandbox-client-id').value='fake-client'; ui.element('#sandbox-client-secret').value='fake-secret';
  await ui.element('#connect-form').listeners.submit({preventDefault(){}});
  assert.equal(ui.element('#connection-status').textContent,'Not connected');
  assert.equal(ui.element('#sandbox-setup').open,true);
  assert.match(ui.element('#connection-message').textContent,/did not retain the connection cookie/);
  assert.equal(ui.element('#checkout-button').disabled,true);
});

test('natural cookie expiry on an open page reveals the reconnect form', async () => {
  const ui = await setup({handler: async path => {
    if(path==='/api/config') return {ok:true,json:async()=>({paypalConfigured:true,connectionMode:'browser_session'})};
    if(path==='/api/orders') return {ok:false,json:async()=>({error:'PayPal sandbox credentials are not configured.',code:'PAYPAL_NOT_CONFIGURED'})};
  }});
  const submitting=ui.element('#plan-form').listeners.submit({preventDefault(){}});
  ui.pendingPlan.resolve(plan); await submitting;
  await ui.element('#checkout-button').listeners.click();
  assert.equal(ui.element('#connection-status').textContent,'Not connected');
  assert.equal(ui.element('#sandbox-setup').open,true);
  assert.equal(ui.element('#checkout-button').disabled,true);
  assert.match(ui.element('#checkout-message').textContent,/connection expired/);
  assert.equal(ui.redirected,null);
});
