/* =============================================================================
 * THE WEEK — meters, week tick, week summary, charity rotation, stage progression
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { Stage } from '../../src/engine/types';
import type { FoodMeter, SaveData, TransactionRecord } from '../../src/state/saveTypes';
import { emptyCoinErrors, freshSave } from '../../src/state/saveTypes';
import {
  CHARITY_ITEMS,
  CHARITY_STOCK_PER_WEEK,
  ELECTRICITY_DAYS_PER_TOPUP,
  FOOD_METER_MAX,
} from '../../src/data/economy';
import {
  STAGE_FIRST_TIME_REQUIRED,
  STAGE_WINDOW,
  charityStockForWeek,
  fillFood,
  heldTotal,
  lightsAreOn,
  nextStage,
  nextWeek,
  recentAttempts,
  shouldAdvanceStage,
  summariseWeek,
  topUpElectricity,
  wentHungry,
} from '../../src/engine/week';

/* ---------------------------------------------------------------------------
 * helpers
 * ------------------------------------------------------------------------- */

function saveWith(overrides: Partial<SaveData> = {}): SaveData {
  return { ...freshSave(), ...overrides };
}

/** A log entry. `ts` is passed in — nothing here calls Date.now(). */
function txn(stage: Stage, attempts: number, price = 5, ts = 0): TransactionRecord {
  return { price, attempts, ts, stage };
}

/** `n` entries at `stage`, the first `firstTime` of which were right first go. */
function run(stage: Stage, n: number, firstTime: number): TransactionRecord[] {
  const out: TransactionRecord[] = [];
  for (let i = 0; i < n; i++) {
    out.push(txn(stage, i < firstTime ? 1 : 2, 5, i));
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * METERS
 * ------------------------------------------------------------------------- */

describe('fillFood', () => {
  it('fills one segment per food purchase', () => {
    expect(fillFood(0)).toBe(1);
    expect(fillFood(1)).toBe(2);
    expect(fillFood(2)).toBe(3);
  });

  it('caps at FOOD_METER_MAX rather than overflowing', () => {
    expect(fillFood(3)).toBe(FOOD_METER_MAX);
    expect(fillFood(fillFood(fillFood(fillFood(0))))).toBe(FOOD_METER_MAX);
  });

  it('never exceeds the maximum however many times it is applied', () => {
    let meter: FoodMeter = 0;
    for (let i = 0; i < 20; i++) meter = fillFood(meter);
    expect(meter).toBe(FOOD_METER_MAX);
  });
});

describe('topUpElectricity', () => {
  it('buys ELECTRICITY_DAYS_PER_TOPUP days', () => {
    expect(topUpElectricity()).toBe(ELECTRICITY_DAYS_PER_TOPUP);
    expect(topUpElectricity()).toBe(7);
  });

  it('is pure — the same answer every time', () => {
    expect(topUpElectricity()).toBe(topUpElectricity());
  });
});

describe('lightsAreOn', () => {
  it('is true while any electricity remains', () => {
    expect(lightsAreOn(7)).toBe(true);
    expect(lightsAreOn(1)).toBe(true);
  });

  it('is false at zero', () => {
    expect(lightsAreOn(0)).toBe(false);
  });
});

describe('wentHungry', () => {
  it('is true for anything short of a full meter', () => {
    expect(wentHungry(0)).toBe(true);
    expect(wentHungry(1)).toBe(true);
    expect(wentHungry(2)).toBe(true);
  });

  it('is false at a full meter', () => {
    expect(wentHungry(3)).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
 * THE WEEK TICK
 * ------------------------------------------------------------------------- */

describe('nextWeek', () => {
  const before = saveWith({
    week: 4,
    purse: [20, 10, 5, 1],
    moneyBox: [50, 20],
    stage: 3,
    bag: [{ itemId: 'toy_car', boughtWeek: 3 }],
    bedroom: ['stickers', 'bouncy_ball'],
    foodMeter: 2,
    electricityDays: 7,
    savingGoal: 'scooter',
    transactionLog: run(3, 4, 3),
    coinErrors: { ...emptyCoinErrors(), 20: 2 },
  });

  it('advances the week counter by one', () => {
    expect(nextWeek(before).week).toBe(5);
  });

  it('resets both meters', () => {
    const after = nextWeek(before);
    expect(after.foodMeter).toBe(0);
    expect(after.electricityDays).toBe(0);
  });

  it('carries everything else over untouched', () => {
    const after = nextWeek(before);
    expect(after.purse).toEqual([20, 10, 5, 1]);
    expect(after.moneyBox).toEqual([50, 20]);
    expect(after.stage).toBe(3);
    expect(after.bag).toEqual([{ itemId: 'toy_car', boughtWeek: 3 }]);
    expect(after.bedroom).toEqual(['stickers', 'bouncy_ball']);
    expect(after.savingGoal).toBe('scooter');
    expect(after.transactionLog).toEqual(before.transactionLog);
    expect(after.coinErrors).toEqual(before.coinErrors);
    expect(after.schemaVersion).toBe(before.schemaVersion);
  });

  it('does not mutate the input', () => {
    const snapshot = structuredClone(before);
    nextWeek(before);
    expect(before).toEqual(snapshot);
  });

  it('returns a new object with independent arrays', () => {
    const after = nextWeek(before);
    expect(after).not.toBe(before);
    expect(after.purse).not.toBe(before.purse);
    expect(after.moneyBox).not.toBe(before.moneyBox);
    expect(after.bag).not.toBe(before.bag);
    expect(after.bedroom).not.toBe(before.bedroom);
    expect(after.transactionLog).not.toBe(before.transactionLog);
    expect(after.coinErrors).not.toBe(before.coinErrors);

    after.purse.push(1);
    after.bedroom.push('bubbles');
    expect(before.purse).toEqual([20, 10, 5, 1]);
    expect(before.bedroom).toEqual(['stickers', 'bouncy_ball']);
  });

  it('is money-preserving — no pence appear or vanish over a tick', () => {
    expect(heldTotal(nextWeek(before))).toBe(heldTotal(before));
  });

  it('runs many weeks without drifting', () => {
    let save = saveWith({ week: 1 });
    for (let i = 0; i < 52; i++) save = nextWeek(save);
    expect(save.week).toBe(53);
    expect(save.foodMeter).toBe(0);
    expect(save.electricityDays).toBe(0);
  });
});

/* ---------------------------------------------------------------------------
 * WEEK SUMMARY
 * ------------------------------------------------------------------------- */

describe('summariseWeek', () => {
  it('reports what she started with, spent and has left', () => {
    const save = saveWith({
      week: 3,
      purse: [10, 5],
      moneyBox: [20],
      foodMeter: 3,
      electricityDays: 7,
    });
    const summary = summariseWeek(80, save);
    expect(summary).toEqual({
      week: 3,
      startedWith: 80,
      spent: 45,
      earned: 0,
      leftWith: 35,
      foodEaten: 3,
      lightsStayedOn: true,
    });
  });

  it('counts bakery wages as earned, not as money she started with', () => {
    // Started with 30p, earned 25p, has 40p left: she spent 15p.
    const save = saveWith({ purse: [20, 10, 10] });
    const summary = summariseWeek(30, save, 25);
    expect(summary.startedWith).toBe(30);
    expect(summary.earned).toBe(25);
    expect(summary.spent).toBe(15);
  });

  it('counts the money box as money she still has', () => {
    const save = saveWith({ purse: [], moneyBox: [50, 20, 2] });
    expect(summariseWeek(72, save).spent).toBe(0);
    expect(summariseWeek(72, save).leftWith).toBe(72);
  });

  it('clamps spent at zero when she ended the week richer', () => {
    // Change received in the same tick can exceed what went out.
    const save = saveWith({ purse: [100, 50] });
    const summary = summariseWeek(30, save);
    expect(summary.leftWith).toBe(150);
    expect(summary.spent).toBe(0);
  });

  it('reports the lights as off when the meter ran out', () => {
    const save = saveWith({ electricityDays: 0 });
    expect(summariseWeek(0, save).lightsStayedOn).toBe(false);
  });

  it('reports the food meter as it stands', () => {
    expect(summariseWeek(0, saveWith({ foodMeter: 1 })).foodEaten).toBe(1);
    expect(summariseWeek(0, saveWith({ foodMeter: 3 })).foodEaten).toBe(3);
  });

  it('reports the week before it rolls over, not after', () => {
    const save = saveWith({ week: 6 });
    expect(summariseWeek(0, save).week).toBe(6);
    expect(summariseWeek(0, nextWeek(save)).week).toBe(7);
  });

  it('produces only integer pence', () => {
    const save = saveWith({ purse: [10, 5, 2, 1], moneyBox: [20] });
    const summary = summariseWeek(99, save);
    expect(Number.isInteger(summary.startedWith)).toBe(true);
    expect(Number.isInteger(summary.spent)).toBe(true);
    expect(Number.isInteger(summary.leftWith)).toBe(true);
  });

  it('does not mutate the save', () => {
    const save = saveWith({ purse: [10], moneyBox: [5] });
    const snapshot = structuredClone(save);
    summariseWeek(50, save);
    expect(save).toEqual(snapshot);
  });
});

/* ---------------------------------------------------------------------------
 * CHARITY SHOP ROTATION
 * ------------------------------------------------------------------------- */

describe('charityStockForWeek', () => {
  const REAL_IDS = CHARITY_ITEMS.map((item) => item.id);

  it('returns exactly CHARITY_STOCK_PER_WEEK items by default', () => {
    for (let week = 1; week <= 50; week++) {
      expect(charityStockForWeek(week)).toHaveLength(CHARITY_STOCK_PER_WEEK);
    }
  });

  it('honours an explicit count', () => {
    expect(charityStockForWeek(1, 1)).toHaveLength(1);
    expect(charityStockForWeek(1, 4)).toHaveLength(4);
    expect(charityStockForWeek(1, 5)).toHaveLength(5);
  });

  it('is deterministic — the same week always gives the same shelf', () => {
    for (let week = 1; week <= 200; week++) {
      expect(charityStockForWeek(week)).toEqual(charityStockForWeek(week));
    }
    // Explicit repeat calls, in case of any hidden generator state.
    const first = charityStockForWeek(17);
    charityStockForWeek(3);
    charityStockForWeek(99);
    expect(charityStockForWeek(17)).toEqual(first);
  });

  it('never repeats an item within a week', () => {
    for (let week = 1; week <= 200; week++) {
      const stock = charityStockForWeek(week);
      expect(new Set(stock).size).toBe(stock.length);
    }
  });

  it('only ever offers real CHARITY_ITEMS ids', () => {
    for (let week = 1; week <= 200; week++) {
      for (const id of charityStockForWeek(week)) {
        expect(REAL_IDS).toContain(id);
      }
    }
  });

  it('actually rotates — at least 8 distinct shelves across weeks 1..200', () => {
    const seen = new Set<string>();
    for (let week = 1; week <= 200; week++) {
      seen.add([...charityStockForWeek(week)].sort().join(','));
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('reaches every item across the year', () => {
    const seen = new Set<string>();
    for (let week = 1; week <= 52; week++) {
      for (const id of charityStockForWeek(week)) seen.add(id);
    }
    expect(seen.size).toBe(REAL_IDS.length);
  });

  it('handles a zero, negative or fractional count without throwing', () => {
    expect(charityStockForWeek(1, 0)).toEqual([]);
    expect(charityStockForWeek(1, -3)).toEqual([]);
    expect(charityStockForWeek(1, Number.NaN)).toEqual([]);
  });

  it('clamps a count larger than the shop to the whole shop', () => {
    const all = charityStockForWeek(1, 99);
    expect(all).toHaveLength(REAL_IDS.length);
    expect([...all].sort()).toEqual([...REAL_IDS].sort());
  });

  it('survives a hand-edited week number', () => {
    expect(charityStockForWeek(0)).toHaveLength(CHARITY_STOCK_PER_WEEK);
    expect(charityStockForWeek(-5)).toHaveLength(CHARITY_STOCK_PER_WEEK);
    expect(charityStockForWeek(Number.NaN)).toHaveLength(CHARITY_STOCK_PER_WEEK);
    expect(charityStockForWeek(1_000_000)).toHaveLength(CHARITY_STOCK_PER_WEEK);
  });

  it('does not usually show the same shelf two weeks running', () => {
    let identical = 0;
    for (let week = 1; week < 200; week++) {
      if (charityStockForWeek(week).join() === charityStockForWeek(week + 1).join()) identical += 1;
    }
    expect(identical).toBeLessThan(20);
  });
});

/* ---------------------------------------------------------------------------
 * recentAttempts
 * ------------------------------------------------------------------------- */

describe('recentAttempts', () => {
  it('returns the last 10 by default, oldest-first', () => {
    const log = run(1, 15, 15).map((entry, i) => ({ ...entry, price: i }));
    const recent = recentAttempts(log);
    expect(recent).toHaveLength(10);
    expect(recent.map((entry) => entry.price)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('honours an explicit n', () => {
    const log = run(1, 15, 15).map((entry, i) => ({ ...entry, price: i }));
    expect(recentAttempts(log, 3).map((entry) => entry.price)).toEqual([12, 13, 14]);
    expect(recentAttempts(log, 1).map((entry) => entry.price)).toEqual([14]);
  });

  it('returns everything when the log is shorter than n', () => {
    const log = run(1, 4, 4);
    expect(recentAttempts(log)).toHaveLength(4);
    expect(recentAttempts(log)).toEqual(log);
  });

  it('returns [] for an empty log or a non-positive n', () => {
    expect(recentAttempts([])).toEqual([]);
    expect(recentAttempts(run(1, 5, 5), 0)).toEqual([]);
    expect(recentAttempts(run(1, 5, 5), -2)).toEqual([]);
  });

  it('does not mutate or alias the log', () => {
    const log = run(1, 12, 12);
    const snapshot = structuredClone(log);
    const recent = recentAttempts(log);
    expect(recent).not.toBe(log);
    expect(log).toEqual(snapshot);
  });
});

/* ---------------------------------------------------------------------------
 * STAGE PROGRESSION
 * ------------------------------------------------------------------------- */

describe('shouldAdvanceStage', () => {
  it('exposes the rule as constants', () => {
    expect(STAGE_WINDOW).toBe(10);
    expect(STAGE_FIRST_TIME_REQUIRED).toBe(8);
  });

  it('advances on exactly 10 entries at this stage with 8 right first time', () => {
    expect(shouldAdvanceStage(run(1, 10, 8), 1)).toBe(true);
  });

  it('advances with 9 or 10 right first time', () => {
    expect(shouldAdvanceStage(run(1, 10, 9), 1)).toBe(true);
    expect(shouldAdvanceStage(run(1, 10, 10), 1)).toBe(true);
  });

  it('does not advance with only 7 right first time', () => {
    expect(shouldAdvanceStage(run(1, 10, 7), 1)).toBe(false);
  });

  it('does not advance on 9 entries, however perfect', () => {
    expect(shouldAdvanceStage(run(1, 9, 9), 1)).toBe(false);
  });

  it('never advances on an empty or short log', () => {
    expect(shouldAdvanceStage([], 1)).toBe(false);
    for (let n = 0; n < 10; n++) {
      expect(shouldAdvanceStage(run(2, n, n), 2)).toBe(false);
    }
  });

  it('does not advance when one of the last 10 is from a previous stage', () => {
    const log = [txn(1, 1), ...run(2, 9, 9)];
    expect(log).toHaveLength(10);
    expect(shouldAdvanceStage(log, 2)).toBe(false);
  });

  it('does not advance when one of the last 10 is from a later stage', () => {
    const log = [...run(2, 9, 9), txn(3, 1)];
    expect(shouldAdvanceStage(log, 2)).toBe(false);
  });

  it('ignores entries beyond the last 10, however bad', () => {
    const ancient = run(1, 40, 0); // forty stage-1 fumbles
    const log = [...ancient, ...run(2, 10, 8)];
    expect(shouldAdvanceStage(log, 2)).toBe(true);
  });

  it('ignores a good older window once the recent 10 are poor', () => {
    const log = [...run(2, 10, 10), ...run(2, 10, 5)];
    expect(shouldAdvanceStage(log, 2)).toBe(false);
  });

  it('never advances from stage 4', () => {
    expect(shouldAdvanceStage(run(4, 10, 10), 4)).toBe(false);
    expect(shouldAdvanceStage(run(4, 50, 50), 4)).toBe(false);
  });

  it('applies the same rule at stages 2 and 3', () => {
    expect(shouldAdvanceStage(run(2, 10, 8), 2)).toBe(true);
    expect(shouldAdvanceStage(run(2, 10, 7), 2)).toBe(false);
    expect(shouldAdvanceStage(run(3, 10, 8), 3)).toBe(true);
    expect(shouldAdvanceStage(run(3, 10, 7), 3)).toBe(false);
  });

  it('counts only attempts === 1, not "few attempts"', () => {
    const log = run(1, 10, 0).map((entry) => ({ ...entry, attempts: 2 }));
    expect(shouldAdvanceStage(log, 1)).toBe(false);
  });

  it('cannot fire twice off one good run — the window refills at the new stage', () => {
    const log = run(1, 10, 10);
    expect(shouldAdvanceStage(log, 1)).toBe(true);
    const promoted = nextStage(1);
    expect(shouldAdvanceStage(log, promoted)).toBe(false);
  });

  it('does not mutate the log', () => {
    const log = run(1, 12, 12);
    const snapshot = structuredClone(log);
    shouldAdvanceStage(log, 1);
    expect(log).toEqual(snapshot);
  });
});

describe('nextStage', () => {
  it('steps up one stage at a time', () => {
    expect(nextStage(1)).toBe(2);
    expect(nextStage(2)).toBe(3);
    expect(nextStage(3)).toBe(4);
  });

  it('stops at 4 — there is nothing above it and no way back down', () => {
    expect(nextStage(4)).toBe(4);
    expect(nextStage(nextStage(nextStage(nextStage(4))))).toBe(4);
  });

  it('never regresses', () => {
    const stages: readonly Stage[] = [1, 2, 3, 4];
    for (const stage of stages) {
      expect(nextStage(stage)).toBeGreaterThanOrEqual(stage);
    }
  });
});
