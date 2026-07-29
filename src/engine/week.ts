/* =============================================================================
 * THE WEEK — meters, the week tick, the week summary, charity-shop rotation and
 * stage progression.
 *
 * MONEY IS INTEGER PENCE. Every function in this file is PURE: no React, no
 * DOM, no I/O, no Date.now(), no Math.random(). The week number is the only
 * clock the game has, and it is passed in.
 * ============================================================================= */

import type { CoinValue, Pence, Stage } from './types';
import type { FoodMeter, SaveData, TransactionRecord } from '../state/saveTypes';
import {
  CHARITY_ITEMS,
  CHARITY_STOCK_PER_WEEK,
  ELECTRICITY_DAYS_PER_TOPUP,
  FOOD_METER_MAX,
} from '../data/economy';

/* ---------------------------------------------------------------------------
 * METERS
 *
 * Neither meter is a fail state. Running out of food or light produces one calm
 * line of dialogue and nothing else — see CLAUDE.md, "No fail states".
 * ------------------------------------------------------------------------- */

/**
 * One food purchase fills one segment of the food meter.
 * Saturates at FOOD_METER_MAX (3); buying a fourth thing to eat is not wasted
 * money in the fiction, it just cannot show any more.
 */
export function fillFood(meter: FoodMeter): FoodMeter {
  const next = meter + 1;
  return next >= FOOD_METER_MAX ? FOOD_METER_MAX : (next as FoodMeter);
}

/**
 * Days of light one 10p top-up buys.
 *
 * NOTE: the game has no days — the week is the only unit of time, and the week
 * reset zeroes this field unconditionally. So in practice this value is a
 * boolean ("has she topped up this week?") stored as 0 or 7. It is modelled as
 * a number because the save schema says 0..7 and because a future version may
 * well want a real countdown.
 */
export function topUpElectricity(): number {
  return ELECTRICITY_DAYS_PER_TOPUP;
}

/** The lights are on while there is any electricity left. */
export function lightsAreOn(electricityDays: number): boolean {
  return electricityDays > 0;
}

/** True when the food meter did not reach full by the end of the week. */
export function wentHungry(foodMeter: FoodMeter): boolean {
  return foodMeter < FOOD_METER_MAX;
}

/* ---------------------------------------------------------------------------
 * THE WEEK TICK
 * ------------------------------------------------------------------------- */

/**
 * Advance to the next week.
 *
 * Returns a NEW save: the week counter goes up by one and both meters reset.
 * Everything she owns — purse, money box, bag, bedroom, saving goal — carries
 * over untouched, as does her stage, her transaction log and her coin errors.
 *
 * Pure: the input save is never mutated, and every array/object is copied so
 * that a later mutation of the result cannot reach back into it.
 */
export function nextWeek(save: SaveData): SaveData {
  return {
    ...save,
    week: save.week + 1,
    foodMeter: 0,
    electricityDays: 0,
    purse: [...save.purse],
    moneyBox: [...save.moneyBox],
    bag: save.bag.map((entry) => ({ ...entry })),
    bedroom: [...save.bedroom],
    transactionLog: [...save.transactionLog],
    coinErrors: { ...save.coinErrors },
  };
}

/* ---------------------------------------------------------------------------
 * THE WEEK SUMMARY
 * ------------------------------------------------------------------------- */

export interface WeekSummary {
  week: number;
  /** purse + moneyBox at the START of the week. */
  startedWith: Pence;
  spent: Pence;
  /** purse + moneyBox now. */
  leftWith: Pence;
  foodEaten: FoodMeter;
  lightsStayedOn: boolean;
}

/** Sum of a coin list, in pence. Local so this file has no barrel dependency. */
function sumCoins(coins: readonly CoinValue[]): Pence {
  let total = 0;
  for (const coin of coins) {
    total += coin;
  }
  return total;
}

/** What she is holding right now, purse and money box together. */
export function heldTotal(save: SaveData): Pence {
  return sumCoins(save.purse) + sumCoins(save.moneyBox);
}

/**
 * The one screen she sees before the week rolls over.
 *
 * `startTotal` is purse + moneyBox as it stood at the start of the week; the
 * caller is responsible for having captured it.
 */
export function summariseWeek(startTotal: Pence, save: SaveData): WeekSummary {
  const leftWith = heldTotal(save);
  const difference = startTotal - leftWith;

  // Clamped at 0 on purpose. Income (pocket money, wages) and change both land
  // in the purse during a week, so she can finish a week holding MORE than she
  // started with. A negative "spent" is meaningless to a six-year-old, and this
  // screen is not an accounting statement — it says what went out, or nothing.
  const spent = difference > 0 ? difference : 0;

  return {
    week: save.week,
    startedWith: startTotal,
    spent,
    leftWith,
    foodEaten: save.foodMeter,
    lightsStayedOn: lightsAreOn(save.electricityDays),
  };
}

/* ---------------------------------------------------------------------------
 * CHARITY SHOP ROTATION
 *
 * The charity shop shows a different handful of second-hand things each week.
 * It MUST be a pure function of the week number: the same week has to show the
 * same shelf after a reload, after a reinstall, and on a different device. No
 * Math.random(), and nothing stored in the save.
 * ------------------------------------------------------------------------- */

/**
 * splitmix32 — a tiny, well-mixed integer hash. Returns a fresh generator
 * seeded from `seed`; each call yields the next uint32.
 *
 * splitmix is used rather than a raw LCG because consecutive seeds (weeks 1, 2,
 * 3 …) must produce completely unrelated streams. An LCG seeded with adjacent
 * values gives adjacent first outputs, which would make the shelf crawl by one
 * item a week instead of rotating.
 */
function splitmix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = z ^ (z >>> 15);
    return z >>> 0;
  };
}

/**
 * The charity shop's stock for a given week: exactly `count` distinct itemIds
 * drawn from CHARITY_ITEMS, deterministic in `week` alone.
 *
 * Implemented as a partial Fisher-Yates shuffle over a copy of the id list,
 * stopped after `count` positions have been settled. A partial shuffle (rather
 * than "pick a random index `count` times") is what guarantees distinctness
 * without a retry loop.
 *
 * `count` is clamped to 0..CHARITY_ITEMS.length; a non-integer or negative week
 * is floored and coerced to a uint32 rather than throwing, since the week comes
 * from a save file that may have been hand-edited.
 */
export function charityStockForWeek(week: number, count: number = CHARITY_STOCK_PER_WEEK): string[] {
  const ids: string[] = CHARITY_ITEMS.map((item) => item.id);
  const total = ids.length;

  const requested = Number.isFinite(count) ? Math.floor(count) : 0;
  const wanted = requested < 0 ? 0 : requested > total ? total : requested;
  if (wanted === 0) return [];

  const safeWeek = Number.isFinite(week) ? Math.floor(week) : 0;
  const nextRandom = splitmix32(safeWeek);

  const pool = [...ids];
  for (let i = 0; i < wanted; i++) {
    const j = i + (nextRandom() % (total - i));
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) continue;
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, wanted);
}

/* ---------------------------------------------------------------------------
 * STAGE PROGRESSION
 *
 * She moves up a stage by being consistently right, not by being fast and not
 * by earning anything. There is no way back down: stages never regress.
 * ------------------------------------------------------------------------- */

/** How many recent purchases the progression rule looks at. */
export const STAGE_WINDOW = 10;

/** How many of those must have been right first time (`attempts === 1`). */
export const STAGE_FIRST_TIME_REQUIRED = 8;

/**
 * The last `n` transactions, OLDEST-FIRST (the log's own order is preserved).
 * Used by the progression rule and shown as evidence on the grown-ups' screen.
 * Returns fewer than `n` when the log is shorter.
 */
export function recentAttempts(log: readonly TransactionRecord[], n: number = STAGE_WINDOW): TransactionRecord[] {
  if (!Array.isArray(log)) return [];
  const size = Number.isFinite(n) ? Math.floor(n) : 0;
  if (size <= 0) return [];
  const from = log.length - size;
  return log.slice(from > 0 ? from : 0);
}

/**
 * Should she move up from `stage`?
 *
 * Exactly: the last 10 entries in the log are ALL at the current stage, and at
 * least 8 of those 10 were right first time. Fewer than 10 entries never
 * advances; stage 4 never advances.
 *
 * Requiring all 10 to be at the current stage is what stops a promotion firing
 * twice off one good run — the moment she advances, her recent history is all
 * at the *previous* stage, so the window has to refill before it can trigger
 * again.
 */
export function shouldAdvanceStage(log: readonly TransactionRecord[], stage: Stage): boolean {
  if (stage === 4) return false;

  const recent = recentAttempts(log, STAGE_WINDOW);
  if (recent.length < STAGE_WINDOW) return false;
  if (!recent.every((entry) => entry.stage === stage)) return false;

  let firstTime = 0;
  for (const entry of recent) {
    if (entry.attempts === 1) firstTime += 1;
  }
  return firstTime >= STAGE_FIRST_TIME_REQUIRED;
}

/** The stage after `stage`. Stage 4 is the last one and stays 4. */
export function nextStage(stage: Stage): Stage {
  return stage === 4 ? 4 : ((stage + 1) as Stage);
}
