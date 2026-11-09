const $ = (selector) => document.querySelector(selector);
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const state = { config: null, plan: null, checkoutRequestId: null, stale: false, busy: false, inputRevision: 0 };
const scenarios = {
  cooking: { need: 'I am moving into my first apartment and need the basics to cook simple meals.', budget: '75' },
  study: { need: 'I want to set up a study desk for taking notes and reading at night.', budget: '55' },
  repairs: { need: 'I need a small kit for basic home repairs, tightening screws and measuring things.', budget: '65' },
  lighting: { need: 'I want portable lighting for a power outage at home.', budget: '50' },
};

function message(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle('error', error);
}

async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('The service could not return a usable response. Please try again.'); }
  if (!response.ok) {
    const error = new Error(typeof result.error === 'string' ? result.error : result.error?.message || result.message || 'The request could not be completed. Please try again.');
    error.code = result.code;
    const expiredBrowserCookie = error.code === 'PAYPAL_NOT_CONFIGURED' && state.config?.connectionMode === 'browser_session';
    if (error.code === 'PAYPAL_SESSION_EXPIRED' || error.code === 'INVALID_SESSION' || expiredBrowserCookie) {
      if (expiredBrowserCookie) error.message = 'Your temporary sandbox connection expired. Connect again and start a new checkout.';
      state.config = { ...state.config, paypalConfigured: false, connectionMode: 'unconfigured' };
      renderConnection();
      refreshCheckout();
    }
    throw error;
  }
  return result;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function refreshCheckout() {
  const available = Boolean(state.config?.paypalConfigured);
  const hasItems = Boolean(state.plan?.items?.length);
  $('#checkout-button').disabled = !available || !hasItems || state.stale || state.busy;
  $('#connect-button').disabled = state.busy;
  $('#disconnect-button').disabled = state.busy;
  if (state.stale) message($('#checkout-message'), 'Your starting point changed. Make a new plan before checkout.');
  else if (!hasItems && state.plan) message($('#checkout-message'), 'There are no items to check out. Try a different need or spending limit.');
  else if (!available) message($('#checkout-message'), 'PayPal sandbox checkout is not connected yet. You can still create and save plans.');
  else message($('#checkout-message'), 'Uses PayPal test funds only. You will review and approve the order in PayPal.');
}

function renderConnection() {
  const available = Boolean(state.config?.paypalConfigured);
  const mode = state.config?.connectionMode || (available ? 'server' : 'unconfigured');
  $('#connection-status').textContent = mode === 'browser_session' ? 'Connected for this browser' : mode === 'server' ? 'Server connection ready' : 'Not connected';
  $('#connection-description').textContent = mode === 'browser_session'
    ? 'This browser has a temporary sandbox connection. Complete checkout before it expires. Disconnecting clears this browser’s token; it does not cancel an existing PayPal order.'
    : mode === 'server' ? 'A sandbox connection is configured on the server. Use a sandbox buyer account to test checkout.'
    : 'Connect your sandbox app for a test checkout. No real money is used.';
  $('#connect-form').classList.toggle('hidden', available);
  $('#disconnect-button').classList.toggle('hidden', mode !== 'browser_session');
  $('#sandbox-setup').open = !available;
}

$('#connect-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.busy) return;
  const clientId = $('#sandbox-client-id').value.trim();
  const clientSecret = $('#sandbox-client-secret').value.trim();
  if (!clientId || !clientSecret) { message($('#connection-message'), 'Enter the sandbox app’s client ID and client secret.', true); return; }
  state.busy = true;
  refreshCheckout();
  $('#sandbox-client-id').disabled = true;
  $('#sandbox-client-secret').disabled = true;
  message($('#connection-message'), 'Connecting directly to PayPal sandbox…');
  try {
    const pending = api('/api/paypal/connect', { clientId, clientSecret });
    // Do not retain credentials in input fields, storage, URLs, or messages.
    $('#sandbox-client-id').value = '';
    $('#sandbox-client-secret').value = '';
    const result = await pending;
    if (result.connected !== true) throw new Error('The sandbox connection was not confirmed.');
    state.config = await api('/api/config');
    renderConnection();
    if (!state.config.paypalConfigured) throw new Error('This browser did not retain the connection cookie. Open ClearCart in its own browser tab, allow cookies for this site, and connect again.');
    sessionStorage.removeItem('clearcart-checkout');
    state.checkoutRequestId = null;
    $('#return-panel').classList.add('hidden');
    history.replaceState(null, '', window.location.pathname);
    renderConnection();
    message($('#connection-message'), `Connected for up to ${Math.floor(result.expiresIn / 60)} minutes. Make or review a plan, then start a new sandbox checkout.`);
  } catch (error) {
    message($('#connection-message'), error.message, true);
  } finally {
    $('#sandbox-client-id').disabled = false;
    $('#sandbox-client-secret').disabled = false;
    state.busy = false; refreshCheckout();
  }
});

$('#disconnect-button').addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true; refreshCheckout();
  try {
    await api('/api/paypal/disconnect', {});
    state.config = await api('/api/config');
    sessionStorage.removeItem('clearcart-checkout');
    state.checkoutRequestId = null;
    $('#return-panel').classList.add('hidden');
    history.replaceState(null, '', window.location.pathname);
    renderConnection();
    message($('#connection-message'), 'Disconnected. Your saved plan is still available; PayPal orders are not canceled by disconnecting.');
  } catch (error) { message($('#connection-message'), error.message, true); }
  finally { state.busy = false; refreshCheckout(); }
});

function markStale() {
  state.inputRevision++;
  if (state.plan) state.stale = true;
  refreshCheckout();
}

function renderPlan(plan) {
  $('#empty-state').classList.add('hidden');
  $('#plan-content').classList.remove('hidden');
  $('#plan-intent').textContent = String(plan.intent?.label || 'Your considered plan').replaceAll('_', ' ').toUpperCase();
  $('#plan-summary-title').textContent = plan.items.length ? 'Useful essentials, considered.' : plan.intent?.label === 'unknown' ? 'A little more context will help.' : 'No new items fit this plan.';
  const confidence = Number(plan.intent?.confidence);
  $('#intent-confidence').textContent = plan.intent?.label !== 'unknown' && Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)).toFixed(2) : '—';
  $('.intent-score').title = 'Relative model score from 0 to 1. It is not calibrated as a probability or tested accuracy.';
  $('#plan-explanation').textContent = plan.explanation || 'This plan uses the demo catalog and your spending limit.';
  $('#total-value').textContent = money(plan.totalCents);
  $('#budget-value').textContent = money(plan.budgetCents);
  $('#remaining-value').textContent = money(plan.remainingCents);
  const percent = plan.budgetCents > 0 ? Math.min(100, Math.round(plan.totalCents / plan.budgetCents * 100)) : 0;
  $('#budget-fill').style.width = `${percent}%`;
  $('#budget-progress').setAttribute('aria-valuenow', String(percent));
  $('#budget-progress').setAttribute('aria-valuetext', `${money(plan.totalCents)} of ${money(plan.budgetCents)} used`);
  const count = plan.items.reduce((sum, item) => sum + item.quantity, 0);
  $('#item-count').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  const list = $('#item-list');
  list.replaceChildren();
  for (const [index, item] of plan.items.entries()) {
    const row = node('li', 'cart-item');
    row.append(node('span', 'item-number', String(index + 1).padStart(2, '0')));
    const details = node('div', 'item-details');
    details.append(node('h4', '', item.name), node('p', '', item.reason));
    const price = node('div', 'item-price', money(item.priceCents * item.quantity));
    price.append(node('small', '', `${item.quantity} × ${money(item.priceCents)}`));
    row.append(details, price);
    list.append(row);
  }
  const notes = [...(plan.warnings || []), ...(plan.missingNeeds || []).map((need) => `Not covered: ${need}`)];
  $('#notes-list').replaceChildren(...notes.map((note) => node('li', '', note)));
  $('#plan-notes').classList.toggle('hidden', notes.length === 0);
  $('#model-method').textContent = plan.intent?.method ? 'Local intent model · budget-checked plan' : 'Budget-checked plan';
  refreshCheckout();
}

$('#plan-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.busy) return;
  const need = $('#need').value.trim();
  const rawBudget = $('#budget').value.trim();
  if (!need) { message($('#form-message'), 'Describe what you need to get started.', true); $('#need').focus(); return; }
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawBudget)) { message($('#form-message'), 'Enter a budget with at most two decimal places.', true); $('#budget').focus(); return; }
  const budgetCents = Math.round(Number(rawBudget) * 100);
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 0 || budgetCents > 1000000) { message($('#form-message'), 'Choose a budget between $0 and $10,000.', true); return; }
  const ownedIds = [...document.querySelectorAll('.owned-option input:checked')].map((input) => input.value);
  const submittedRevision = state.inputRevision;
  state.busy = true;
  $('#plan-button').disabled = true;
  $('#plan-button-label').textContent = 'Considering your options…';
  $('#result-panel').setAttribute('aria-busy', 'true');
  message($('#form-message'), 'Matching your need and checking the budget…');
  refreshCheckout();
  try {
    const plan = await api('/api/plan', { need, budgetCents, ownedIds });
    if (!Array.isArray(plan.items) || !Number.isInteger(plan.totalCents)) throw new Error('The plan was incomplete. Please try again.');
    state.plan = plan;
    state.stale = state.inputRevision !== submittedRevision;
    state.checkoutRequestId = null;
    renderPlan(plan);
    message($('#form-message'), state.stale ? 'Your inputs changed while this plan was being created. Make a new plan to use the latest choices.' : plan.items.length ? 'Your plan is ready. Review the choices and tradeoffs.' : 'No cart was created. See the plan notes for the next step.');
    $('#plan-title').tabIndex = -1;
    $('#plan-title').focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 780px)').matches) $('#result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { message($('#form-message'), error.message, true); }
  finally {
    state.busy = false;
    $('#plan-button').disabled = false;
    $('#plan-button-label').textContent = 'Make my plan';
    $('#result-panel').setAttribute('aria-busy', 'false');
    refreshCheckout();
  }
});

$('#need').addEventListener('input', () => {
  document.querySelectorAll('.example').forEach((button) => button.classList.remove('selected'));
  markStale();
});
$('#budget').addEventListener('input', markStale);
document.querySelectorAll('[data-scenario]').forEach((button) => button.addEventListener('click', () => {
  const scenario = scenarios[button.dataset.scenario];
  $('#need').value = scenario.need;
  $('#budget').value = scenario.budget;
  document.querySelectorAll('.example').forEach((item) => item.classList.toggle('selected', item === button));
  markStale();
  message($('#form-message'), 'Situation added. Adjust it to fit you, then make your plan.');
}));

$('#download-button').addEventListener('click', () => {
  if (!state.plan) return;
  const blob = new Blob([JSON.stringify({ application: 'ClearCart', catalog: 'Synthetic demonstration catalog; no real product fulfillment', ...state.plan }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = node('a');
  link.href = url;
  link.download = 'clearcart-plan.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#checkout-button').addEventListener('click', async () => {
  if (!state.plan?.items?.length || state.stale || state.busy || !state.config?.paypalConfigured) return;
  state.busy = true;
  state.checkoutRequestId ||= crypto.randomUUID();
  const checkoutRevision = state.inputRevision;
  refreshCheckout();
  $('#checkout-button-label').textContent = 'Preparing your sandbox order…';
  try {
    const order = await api('/api/orders', { items: state.plan.items.map(({ id, quantity }) => ({ id, quantity })), budgetCents: state.plan.budgetCents, requestId: state.checkoutRequestId });
    if (state.inputRevision !== checkoutRevision) throw new Error('Your starting point changed during checkout preparation. Make and review a new plan before continuing.');
    const approval = new URL(order.approvalUrl);
    if (approval.protocol !== 'https:' || !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(approval.hostname) || approval.username || approval.password || approval.port) throw new Error('The payment service did not return a valid PayPal sandbox link.');
    if (!order.id || !order.state) throw new Error('The order could not be saved safely. Please try again.');
    sessionStorage.setItem('clearcart-checkout', JSON.stringify({ id: order.id, state: order.state, plan: state.plan, createdAt: Date.now() }));
    window.location.assign(approval.href);
  } catch (error) {
    state.busy = false;
    refreshCheckout();
    message($('#checkout-message'), error.message, true);
    $('#checkout-button-label').textContent = 'Continue to PayPal sandbox';
  }
});

async function initialize() {
  const results = await Promise.allSettled([api('/api/config'), api('/api/catalog')]);
  if (results[0].status === 'fulfilled') state.config = results[0].value;
  renderConnection();
  if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.items)) {
    const list = $('#owned-list');
    list.replaceChildren();
    for (const item of results[1].value.items) {
      const label = node('label', 'owned-option');
      const checkbox = node('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.id;
      checkbox.addEventListener('change', () => {
        $('#owned-count').textContent = `${document.querySelectorAll('.owned-option input:checked').length} selected`;
        markStale();
      });
      label.append(checkbox, node('span', '', item.name), node('small', '', money(item.priceCents)));
      list.append(label);
    }
  } else $('#owned-list').replaceChildren(node('p', 'field-hint', 'The catalog is unavailable right now. Refresh to try again.'));
  refreshCheckout();
  initializeReturn();
}

function initializeReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('canceled') === '1') {
    $('#return-panel').classList.remove('hidden');
    $('#return-heading').textContent = 'Checkout canceled';
    $('#return-description').textContent = 'You left sandbox checkout. You can make a new plan whenever you are ready.';
    $('#capture-button').classList.add('hidden');
    history.replaceState(null, '', window.location.pathname);
    return;
  }
  const token = params.get('token');
  if (!token) return;
  const panel = $('#return-panel');
  panel.classList.remove('hidden');
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem('clearcart-checkout')); } catch { /* No usable local checkout record. */ }
  if (!/^[a-zA-Z0-9-]{5,80}$/.test(token) || !saved || saved.id !== token || !saved.state || Date.now() - saved.createdAt > 3600000) {
    $('#return-heading').textContent = 'This checkout cannot be continued';
    $('#return-description').textContent = 'The saved checkout is missing or expired. Start a new plan in the same browser tab.';
    $('#capture-button').classList.add('hidden');
    return;
  }
  if (saved.plan) {
    state.plan = saved.plan;
    state.stale = true;
    renderPlan(saved.plan);
    $('#return-total').textContent = `Sandbox order total: ${money(saved.plan.totalCents)}`;
  }
  $('#capture-button').addEventListener('click', async () => {
    if (state.busy) return;
    state.busy = true;
    refreshCheckout();
    $('#capture-button').disabled = true;
    message($('#return-message'), 'Completing the PayPal sandbox payment…');
    try {
      const result = await api(`/api/orders/${encodeURIComponent(token)}/capture`, { state: saved.state });
      if (result.status !== 'COMPLETED') throw new Error('PayPal has not confirmed a completed payment. Please try again after approval.');
      $('#return-heading').textContent = 'Sandbox payment completed';
      $('#return-description').textContent = 'PayPal confirmed the test payment. No real money was transferred and no products will be shipped.';
      message($('#return-message'), `Sandbox order: ${result.id || token}`);
      $('#capture-button').classList.add('hidden');
      sessionStorage.removeItem('clearcart-checkout');
      history.replaceState(null, '', window.location.pathname);
    } catch (error) {
      message($('#return-message'), error.message, true);
      $('#capture-button').disabled = false;
    } finally { state.busy = false; refreshCheckout(); }
  });
  panel.focus({ preventScroll: true });
}

initialize().catch(() => message($('#form-message'), 'Some setup information could not be loaded. Refresh to try again.', true));
