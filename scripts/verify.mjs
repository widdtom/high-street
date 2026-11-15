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

  /** Walk the three Saturday beats through to the street. */
  async function playSaturday() {
    await page.locator('[data-testid="collect-coins"]').click();
    await page.waitForTimeout(1100);
    for (let i = 0; i < 2; i += 1) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(200);
  }

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOTS}/01-saturday.png` });

  console.log('\nSaturday sequence');
  const beforeCoins = await save();
  check('save is schema v3', beforeCoins?.schemaVersion === 3, `got ${beforeCoins?.schemaVersion}`);
  check('week starts at 1', beforeCoins?.week === 1, `week ${beforeCoins?.week}`);
  const purseBefore = beforeCoins.purse.reduce((a, b) => a + b, 0);
  check("week 1's pocket money is already banked", purseBefore === 30, `${purseBefore}p`);

  await playSaturday();
  await page.screenshot({ path: `${SHOTS}/02-street.png` });
  const startSave = await save();
  // The ceremony is presentational. If it granted the money, a reload would
  // pay her twice.
  check(
    'playing the Saturday ceremony grants nothing by itself',
    startSave.purse.reduce((a, b) => a + b, 0) === purseBefore,
    `${purseBefore} -> ${startSave.purse.reduce((a, b) => a + b, 0)}`,
  );
  check('the street is reachable', await page.getByRole('button', { name: 'Bakery' }).isVisible());

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
  check('a corrupt save falls back to a fresh game', (await save())?.schemaVersion === 3);
  // A fresh game opens on the Saturday ceremony, where the meter bar is hidden.
  check('the app still renders', await page.locator('[data-testid="collect-coins"]').isVisible());
  await playSaturday();
  check('and is playable', await page.getByRole('button', { name: 'Bakery' }).isVisible());

  console.log('\nA real v1 save migrates in place');
  // Captured from the running prompt-1 build, under the OLD key.
  const V1 = {
    schemaVersion: 1,
    purse: [10, 10, 5, 2, 2, 1],
    stage: 2,
    transactionLog: [
      { price: 5, correct: true, ts: 1785321333799 },
      { price: 12, correct: false, ts: 1785322732569 },
    ],
    coinErrors: { 1: 0, 2: 1, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 200: 0 },
  };
  await page.evaluate((v1) => {
    localStorage.clear();
    localStorage.setItem('highstreet.save.v1', JSON.stringify(v1));
  }, V1);
  await page.reload({ waitUntil: 'networkidle' });
  const migrated = await save();
  check('a v1 save is found and upgraded', migrated?.schemaVersion === 3);
  check('the purse survives coin for coin', JSON.stringify(migrated?.purse) === JSON.stringify(V1.purse), JSON.stringify(migrated?.purse));
  check('the stage survives', migrated?.stage === 2);
  check('coinErrors survive', migrated?.coinErrors['2'] === 1);
  check('every log entry survives', migrated?.transactionLog.length === 2);
  check(
    'correct/false became attempts 1/2',
    migrated?.transactionLog[0]?.attempts === 1 && migrated?.transactionLog[1]?.attempts === 2,
    JSON.stringify(migrated?.transactionLog.map((t) => t.attempts)),
  );
  check('the new v2 fields are present', migrated?.week === 1 && Array.isArray(migrated?.moneyBox));

  console.log('\nWrong coins give change, in all four shops');
  // A purse of a single 20p against prices that 20p cannot make exactly.
  const SHOPS = [
    ['Bakery', 'Loaf of bread', 12],
    ['Greengrocer', 'Bag of potatoes', 15],
    ['Toy shop', 'Sticker sheet', 10],
    ['Charity shop', null, null],
  ];
  for (const [shop, itemName, price] of SHOPS) {
    await page.evaluate(() => {
      const k = 'highstreet.save.v2';
      const s = JSON.parse(localStorage.getItem(k));
      s.purse = [20];
      s.stage = 2;
      localStorage.setItem(k, JSON.stringify(s));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: shop }).click();
    await page.waitForTimeout(200);

    // The charity shop's stock rotates, so take whatever is on the shelf.
    const card = itemName === null
      ? page.locator('[data-testid="charity-item"]').first()
      // `exact` matters in the toy shop: the goal star's label contains the
      // item name too ("Save for Sticker sheet").
      : page.getByRole('button', { name: itemName, exact: true });
    const chargedRaw = itemName === null
      ? await page.locator('[data-testid="charity-item"]').first().getAttribute('data-item-id')
      : null;
    await card.click();
    await page.locator('[data-testid="purse-tray"]').getByRole('button', { name: '20p' }).click();
    await page.getByRole('button', { name: 'Pay' }).click();
    await page.waitForTimeout(350);

    const outcome = await page.locator('[data-testid="outcome-overlay"]').getAttribute('data-outcome');
    const after = await save();
    const left = after.purse.reduce((a, b) => a + b, 0);
    const paid = price ?? 20 - left;
    check(
      `${shop}: overpaying with a 20p returns the right change`,
      outcome === 'over' && left === 20 - paid,
      `outcome=${outcome} left=${left}p${chargedRaw ? ` (${chargedRaw})` : ''}`,
    );
    await page.screenshot({ path: `${SHOTS}/2${SHOPS.indexOf(SHOPS.find((s) => s[0] === shop))}-${shop.replace(/\s+/g, '-')}.png` });
  }

  console.log('\nThe bakery shift: the boss\'s jobs, five customers, wages and the tip jar');
  await page.evaluate(() => {
    const k = 'highstreet.save.v2';
    const s = JSON.parse(localStorage.getItem(k));
    s.purse = [10];
    s.stage = 2;
    s.shiftWeek = null;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  const sign = page.locator('[data-testid="help-wanted"]');
  check('the bakery has a Help wanted sign', (await sign.getAttribute('data-worked')) === 'false');
  await sign.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/30-shift-order.png` });

  /** Greedy coins for an amount, from the till's stage 2 coins. */
  const coinsFor = (n) => {
    const out = [];
    for (const c of [20, 10, 5, 2, 1]) while (n >= c) { out.push(c); n -= c; }
    return out;
  };

  /** Do whichever of the boss's jobs is on screen, right first time. */
  async function doJob(shotName) {
    const job = page.locator('[data-testid="job"]');
    const kind = await job.getAttribute('data-job');
    const done = page.locator('[data-testid="job-done"]');
    if (await done.count()) {
      // Pressing Done with nothing done: one calm line, nothing else.
      const before = await page.locator('[data-testid="speech"]').getAttribute('data-text');
      await done.click();
      await page.waitForTimeout(150);
      const after = await page.locator('[data-testid="speech"]').getAttribute('data-text');
      check(`${kind}: not-done-yet gets a calm line from the boss`, before !== after && (await page.locator('[data-testid="task-step"]').getAttribute('data-finished')) === 'false', after);
    }
    if (kind === 'roll') {
      const n = Number(await job.getAttribute('data-rolls'));
      for (let i = 0; i < n; i += 1) await page.locator('[data-testid="rolling-pin"]').click();
      await page.waitForTimeout(1100);
    } else if (kind === 'fill') {
      const jam = Number(await job.getAttribute('data-jam'));
      const cream = Number(await job.getAttribute('data-cream'));
      await page.locator('[data-testid="filling"][data-filling="jam"]').click();
      for (let i = 0; i < jam; i += 1) await page.locator('[data-testid="doughnut"]').nth(i).click();
      await page.locator('[data-testid="filling"][data-filling="cream"]').click();
      for (let i = 0; i < cream; i += 1) await page.locator('[data-testid="doughnut"]').nth(jam + i).click();
      await done.click();
    } else if (kind === 'decorate') {
      const pattern = (await job.getAttribute('data-pattern')).split(',');
      const given = Number(await job.getAttribute('data-given'));
      for (let i = given; i < pattern.length; i += 1) {
        await page.locator(`[data-testid="fruit"][data-fruit="${pattern[i]}"]`).click();
        await page.locator('[data-testid="cake-slot"]').nth(i).click();
      }
      await done.click();
    } else if (kind === 'oven') {
      const want = JSON.parse(await job.getAttribute('data-oven'));
      for (const shelf of ['top', 'bottom']) {
        await page.locator(`[data-testid="oven-item"][data-item="${want[shelf].item}"]`).click();
        for (let i = 0; i < want[shelf].count; i += 1) {
          await page.locator(`[data-testid="shelf-add"][data-shelf="${shelf}"]`).click();
        }
      }
      await done.click();
      await page.waitForTimeout(2500);
    } else if (kind === 'sweep') {
      const n = Number(await job.getAttribute('data-piles'));
      for (let i = 0; i < n; i += 1) {
        await page.locator('[data-testid="crumbs"][data-swept="false"]').first().click();
      }
      await page.waitForTimeout(900);
      check('sweep: the dustpan shows every pile', (await page.locator('[data-testid="dustpan"]').getAttribute('data-count')) === String(n));
      await page.locator(`[data-testid="count-choice"][data-value="${n}"]`).click();
    }
    await page.waitForTimeout(200);
    check(`${kind}: the job is done`, (await page.locator('[data-testid="task-step"]').getAttribute('data-finished')) === 'true');
    if (shotName) await page.screenshot({ path: `${SHOTS}/${shotName}` });
    await page.locator('[data-testid="task-next"]').click();
    await page.waitForTimeout(900);
  }

  let firstWrongDone = false;
  let jobs = 0;
  let customers = 0;
  for (let n = 0; n < 8; n += 1) {
    if (await page.locator('[data-testid="task-step"]').count()) {
      jobs += 1;
      if (jobs === 1) {
        const text = await page.locator('[data-testid="speech"]').getAttribute('data-text');
        check('the boss says hello and asks for a job', text.startsWith('Hello!'), text);
      }
      await doJob(`37-job-${jobs}.png`);
      continue;
    }
    customers += 1;
    const order = page.locator('[data-testid="order"]');
    const items = (await order.getAttribute('data-items')).split(',');
    const kind = await order.getAttribute('data-topping-kind');
    const toppingCount = kind
      ? Number(await page.locator('[data-testid="order-toppings"]').getAttribute('data-count'))
      : 0;
    const said = await page.locator('[data-testid="speech"]').getAttribute('data-text');
    check(`customer ${customers}: says their order out loud`, said.includes('Can I have'), said);

    if (!firstWrongDone) {
      // A wrong order first: nothing moves, the customer just asks again.
      await page.locator('[data-testid="shelf-item"][data-item-id="sausage_roll"]').click();
      await page.locator('[data-testid="shelf-item"][data-item-id="sausage_roll"]').click();
      await page.locator('[data-testid="shelf-item"][data-item-id="sausage_roll"]').click();
      await page.locator('[data-testid="serve"]').click();
      await page.waitForTimeout(150);
      check('a wrong order keeps her making it', (await page.locator('[data-testid="work-area"]').getAttribute('data-phase')) === 'make');
      check('the customer is thinking, not cross', (await page.locator('[data-testid="customer-art"]').getAttribute('data-mood')) === 'thinking');
      await page.screenshot({ path: `${SHOTS}/31-shift-wrong-order.png` });
      for (let i = 0; i < 3; i += 1) await page.locator('[data-testid="tray-item"]').first().click();
    }

    for (const id of items) await page.locator(`[data-testid="shelf-item"][data-item-id="${id}"]`).click();
    for (let i = 0; i < toppingCount; i += 1) {
      await page.locator(`[data-testid="topping-button"][data-kind="${kind}"]`).click();
    }
    await page.locator('[data-testid="serve"]').click();
    await page.waitForTimeout(150);
    check(`customer ${customers}: the order is right`, (await page.locator('[data-testid="work-area"]').getAttribute('data-phase')) === 'change');

    const price = Number(await page.locator('[data-testid="order-price"]').getAttribute('data-price'));
    const paid = Number(await page.locator('[data-testid="handed-over"]').getAttribute('data-paid'));
    if (!firstWrongDone) {
      await page.screenshot({ path: `${SHOTS}/33-shift-change.png` });
      // Too much change first.
      await page.locator('[data-testid="till-coin"][data-value="20"]').click();
      await page.locator('[data-testid="give-change"]').click();
      await page.waitForTimeout(150);
      check('too much change is not taken', (await page.locator('[data-testid="work-area"]').getAttribute('data-phase')) === 'change');
      check('her purse is untouched mid-shift', JSON.stringify((await save()).purse) === '[10]');
      await page.getByRole('button', { name: 'Put back', exact: true }).click();
    }
    for (const c of coinsFor(paid - price)) {
      await page.locator(`[data-testid="till-coin"][data-value="${c}"]`).click();
    }
    await page.locator('[data-testid="give-change"]').click();
    await page.waitForTimeout(200);
    check(`customer ${customers}: the change is right (${paid}p - ${price}p)`, (await page.locator('[data-testid="work-area"]').getAttribute('data-phase')) === 'thanks');
    if (!firstWrongDone) await page.screenshot({ path: `${SHOTS}/34-shift-thanks.png` });
    firstWrongDone = true;
    await page.locator('[data-testid="next-customer"]').click();
    await page.waitForTimeout(800);
  }
  check('three jobs and five customers', jobs === 3 && customers === 5, `jobs=${jobs} customers=${customers}`);

  check('the tip jar holds 5p', (await page.locator('[data-testid="tip-jar"]').getAttribute('data-pennies')) === '5');
  await page.screenshot({ path: `${SHOTS}/35-shift-payday.png` });
  await page.locator('[data-testid="collect-wages"]').click();
  await page.waitForTimeout(1500);
  const paidSave = await save();
  check('wages + tips land in her purse: 10p + 25p', paidSave.purse.reduce((a, b) => a + b, 0) === 35, JSON.stringify(paidSave.purse));
  check('the week is marked as worked', paidSave.shiftWeek === paidSave.week);
  check('back on the street, the sign says see you next week', (await sign.getAttribute('data-worked')) === 'true');
  await page.screenshot({ path: `${SHOTS}/36-street-after-shift.png` });
  await page.reload({ waitUntil: 'networkidle' });
  await sign.click();
  check('a reload cannot pay her twice', await page.locator('[data-testid="shift-closed"]').isVisible());
  check('purse unchanged after the reload', (await save()).purse.reduce((a, b) => a + b, 0) === 35);

  console.log('\nPrivacy');
  check('zero off-origin requests', offsite.length === 0, offsite.slice(0, 3).join(', '));
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  await browser.close();
} finally {
  server.kill();
}

console.log(failures === 0 ? '\nAll live checks passed.' : `\n${failures} live check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
