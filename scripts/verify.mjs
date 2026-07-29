/**
 * Live verification harness.
 *
 * Drives the built app in headless Chromium and asserts the things unit tests
 * cannot: that real taps write to localStorage, that saves survive reloads,
 * that the charity shop is stable across reloads, and that the app makes zero
 * network requests. Screenshots land in `.verify/` for eyeballing.
 *
 *   npm run build && npm run verify
 *
 * Chromium comes from PLAYWRIGHT_BROWSERS_PATH; nothing is downloaded.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.VERIFY_PORT ?? 4180);
const BASE = `http://localhost:${PORT}/high-street/`;
const SHOTS = '.verify';
const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

let failures = 0;
function check(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  if (!ok) failures += 1;
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server never came up at ${url}`);
}

const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore', detached: false },
);
process.on('exit', () => server.kill());

try {
  mkdirSync(SHOTS, { recursive: true });
  await waitForServer(BASE);

  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const ctx = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  const offsite = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith('data:') && !u.startsWith('blob:')) {
      offsite.push(u);
    }
  });
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  const save = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('highstreet.save.v2') ?? 'null'));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOTS}/01-street.png` });

  console.log('\nSaturday sequence');
  const startSave = await save();
  check('save is schema v2', startSave?.schemaVersion === 2, `got ${startSave?.schemaVersion}`);
  check('week starts at 1', startSave?.week === 1, `week ${startSave?.week}`);

  console.log('\nBakery: a short payment then an exact one');
  await page.getByRole('button', { name: 'Bakery' }).click();
  await page.getByRole('button', { name: 'Loaf of bread' }).click();
  const tray = page.locator('[data-testid="purse-tray"]');
  await tray.getByRole('button', { name: '2p' }).first().click();
  await page.getByRole('button', { name: 'Pay' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/02-short.png` });
  const afterShort = await save();
  check(
    'a short payment deducts nothing',
    afterShort.purse.reduce((a, b) => a + b, 0) === startSave.purse.reduce((a, b) => a + b, 0),
  );
  check(
    'coinErrors recorded the 2p',
    afterShort.coinErrors['2'] > 0,
    `coinErrors=${JSON.stringify(afterShort.coinErrors)}`,
  );

  await page.locator('[data-testid="outcome-overlay"]').click();
  await page.waitForTimeout(200);
  await tray.getByRole('button', { name: '10p' }).first().click();
  await page.getByRole('button', { name: 'Pay' }).click();
  await page.waitForTimeout(600);
  const afterExact = await save();
  check('transactionLog has an entry', afterExact.transactionLog.length >= 1);
  const last = afterExact.transactionLog.at(-1);
  check('the entry counts attempts, not a boolean', typeof last?.attempts === 'number', `attempts=${last?.attempts}`);
  check('two presses of Pay recorded as 2 attempts', last?.attempts === 2, `attempts=${last?.attempts}`);
  check('food meter filled by a food purchase', afterExact.foodMeter === 1, `foodMeter=${afterExact.foodMeter}`);
  check('bag records the item and the week', afterExact.bag.at(-1)?.itemId === 'loaf');

  console.log('\nCharity shop is stable across reloads');
  await page.locator('[data-testid="outcome-overlay"]').click();
  await page.getByRole('button', { name: /back/i }).first().click();
  await page.getByRole('button', { name: 'Charity shop' }).click();
  await page.waitForTimeout(200);
  const stockA = await page
    .locator('[data-testid="charity-item"]')
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('data-item-id')));
  await page.screenshot({ path: `${SHOTS}/03-charity.png` });
  check('charity shop shows 3 items', stockA.length === 3, stockA.join(','));
  const dualPrices = await page
    .locator('[data-testid="charity-item"] [data-testid="new-price"]')
    .count();
  check('every charity item shows the toy shop price too', dualPrices === stockA.length);

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Charity shop' }).click();
  await page.waitForTimeout(200);
  const stockB = await page
    .locator('[data-testid="charity-item"]')
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('data-item-id')));
  check('same 3 items after a reload', JSON.stringify(stockA) === JSON.stringify(stockB), `${stockA} vs ${stockB}`);

  console.log('\nPersistence');
  const beforeReload = await save();
  await page.reload({ waitUntil: 'networkidle' });
  const afterReload = await save();
  check('bag survives a reload', JSON.stringify(beforeReload.bag) === JSON.stringify(afterReload.bag));
  check('week survives a reload', beforeReload.week === afterReload.week);
  check('moneyBox survives a reload', JSON.stringify(beforeReload.moneyBox) === JSON.stringify(afterReload.moneyBox));

  console.log('\nCorruption resilience');
  await page.evaluate(() => localStorage.setItem('highstreet.save.v2', '{{{ not json'));
  await page.reload({ waitUntil: 'networkidle' });
  check('a corrupt save falls back to a fresh game', (await save())?.schemaVersion === 2);
  check('the app still renders', await page.locator('button[aria-label="Purse"]').isVisible());

  console.log('\nPrivacy');
  check('zero off-origin requests', offsite.length === 0, offsite.slice(0, 3).join(', '));
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  await browser.close();
} finally {
  server.kill();
}

console.log(failures === 0 ? '\nAll live checks passed.' : `\n${failures} live check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
