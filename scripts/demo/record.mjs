/**
 * Cloud-only ClearCart browser capture.
 *
 * REQUIREMENTS: Node >=22, Playwright installed in CI, Chromium downloaded.
 * SECURITY: Does not use PayPal credentials and never simulates a successful payment.
 * OUTPUTS: real browser video + PNG evidence + machine-readable audit.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const out = path.resolve('artifacts/clearcart-demo');
await mkdir(out, { recursive: true });
await mkdir(path.join(out, 'raw'), { recursive: true });
const startedAt = new Date().toISOString();
const errors = [];
const observations = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: '3456', HOST: '127.0.0.1',
    PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', APP_ORIGIN: '' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', b => process.stdout.write('[ClearCart] ' + b));
server.stderr.on('data', b => process.stderr.write('[ClearCart] ' + b));
let browser;
let rawVideoPath;
const base = 'http://127.0.0.1:3456';

try {
  let healthy = false;
  for (let i = 0; i < 45; i++) {
    try {
      const r = await fetch(base + '/api/config');
      if (r.ok) { healthy = true; break; }
    } catch {}
    await pause(400);
  }
  if (!healthy) throw new Error('Application did not start on 127.0.0.1:3456');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 1, locale: 'en-US', colorScheme: 'light',
    recordVideo: { dir: path.join(out, 'raw'), size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push('pageerror: ' + error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console-error: ' + msg.text()); });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#need').waitFor({ state: 'visible' });
  const config = await page.evaluate(async () => {
    const r = await fetch('/api/config');
    return r.json();
  });
  observations.push('PayPal configured in credential-free CI: ' + Boolean(config.paypalConfigured));
  if (config.paypalConfigured) throw new Error('Unexpected PayPal credentials in recording environment');
  await pause(4200);
  await page.screenshot({ path: path.join(out, '01-home.png'), fullPage: true });
  await page.locator('[data-scenario="cooking"]').click();
  observations.push('Selected real first-kitchen scenario');
  await pause(3000);
  await page.locator('#plan-button').click();
  await page.locator('#plan-content').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#item-list li').first().waitFor({ state: 'visible', timeout: 20000 });
  const firstItem = await page.locator('#item-list li h4').first().innerText();
  const firstTotal = await page.locator('#total-value').innerText();
  const firstBudget = await page.locator('#budget-value').innerText();
  observations.push('Initial actual result: ' + firstTotal + ' of ' + firstBudget + '; first item ' + firstItem);
  await page.locator('#result-panel').scrollIntoViewIfNeeded();
  await pause(3200);
  await page.screenshot({ path: path.join(out, '02-initial-plan.png'), fullPage: true });
  await page.locator('#item-list').scrollIntoViewIfNeeded();
  await pause(3100);
  await page.locator('#total-value').scrollIntoViewIfNeeded();
  await pause(2600);
  await page.locator('.owned-section summary').click();
  const ownedRow = page.locator('.owned-option').filter({ hasText: firstItem }).first();
  await ownedRow.locator('input').check();
  observations.push('Selected actual owned item: ' + firstItem);
  await pause(3400);
  await page.locator('#plan-button').click();
  await page.locator('#result-panel').scrollIntoViewIfNeeded();
  await page.locator('#plan-content').waitFor({ state: 'visible' });
  await pause(3400);
  const afterOwned = await page.locator('#total-value').innerText();
  observations.push('After owned-item regeneration: ' + afterOwned);
  await page.screenshot({ path: path.join(out, '03-owned-item.png'), fullPage: true });
  await page.locator('#budget').fill('45');
  await page.locator('#plan-button').click();
  await page.locator('#result-panel').scrollIntoViewIfNeeded();
  await pause(4300);
  const afterBudget = await page.locator('#total-value').innerText();
  const currentBudget = await page.locator('#budget-value').innerText();
  const totalNumber = Number(afterBudget.replace(/[^0-9.]/g, ''));
  const budgetNumber = Number(currentBudget.replace(/[^0-9.]/g, ''));
  if (totalNumber > budgetNumber + 0.00001) throw new Error('Budget constraint violated: ' + afterBudget + ' > ' + currentBudget);
  observations.push('After lowered budget: ' + afterBudget + ' of ' + currentBudget);
  await page.screenshot({ path: path.join(out, '04-lowered-budget.png'), fullPage: true });
  await pause(4600);
  await page.locator('#sandbox-setup summary').click();
  await page.locator('#sandbox-setup').scrollIntoViewIfNeeded();
  observations.push('Showed real unconfigured PayPal sandbox UI; no real payment was attempted');
  await pause(4400);
  await page.screenshot({ path: path.join(out, '05-sandbox-unconfigured.png'), fullPage: true });
  await page.locator('#result-panel').scrollIntoViewIfNeeded();
  await pause(3200);
  const video = page.video();
  await context.close();
  rawVideoPath = await video.path();
  await browser.close(); browser = undefined;

  const bytes = await readFile(rawVideoPath);
  const audit = {
    project: 'ClearCart', dateUTC: startedAt, evidenceType: 'authentic_local_chromium_ui',
    environment: 'GitHub Actions / headless Chromium', url: base,
    paypalSandboxActualCaptureVerified: false,
    paypalPaymentSimulationShownAsReal: false,
    userComputerUsed: false, webcamUsed: false, userVoiceUsed: false,
    screenshots: ['01-home.png', '02-initial-plan.png', '03-owned-item.png',
      '04-lowered-budget.png', '05-sandbox-unconfigured.png'],
    observations, browserErrors: errors, recordedVideo: path.relative(out, rawVideoPath),
    videoSHA256: createHash('sha256').update(bytes).digest('hex'),
    caveat: 'This is a truthful planning walkthrough. Genuine PayPal sandbox OAuth, buyer approval and provider capture are separate unverified tasks.'
  };
  await writeFile(path.join(out, 'browser-audit.json'), JSON.stringify(audit, null, 2) + '\n');
  console.log('DEMO_BROWSER_AUDIT=' + JSON.stringify(audit));
  if (errors.length) console.warn('Browser console errors: ' + errors.join(' | '));
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
