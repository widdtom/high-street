/* =============================================================================
 * SAVE MIGRATION
 *
 * The v1 fixtures in tests/fixtures/ are REAL saves captured out of the running
 * prompt-1 app and are read from disk verbatim. If a change to the migration
 * would lose a coin, a log entry or an error count from one of these, this file
 * fails.
 * ============================================================================= */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CoinValue, Stage } from '../../src/engine/types';
import { isCoinValue } from '../../src/engine/coins';
import type { SaveData, SaveDataV1 } from '../../src/state/saveTypes';
import { ALL_COIN_VALUES_LIST, CURRENT_SCHEMA_VERSION, emptyCoinErrors } from '../../src/state/saveTypes';
import { migrateToCurrent } from '../../src/state/migrate';

/* ---------------------------------------------------------------------------
 * fixtures, read off disk
 *
 * The fixtures are read as bytes and JSON.parse'd, exactly as the app parses
 * what it finds in localStorage — not imported as modules — so that these tests
 * exercise the same untrusted-value path the real loader does.
 *
 * ------------------------------------------------------------------------- */

function loadFixture(name: string): unknown {
  const path = new URL(`../fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

const FIXTURE_NAMES = ['save-v1-simple.json', 'save-v1-short.json', 'save-v1-rich.json'] as const;

/** Non-null assertion helper — keeps `strict` happy without `!` everywhere. */
function migrated(raw: unknown): SaveData {
  const result = migrateToCurrent(raw);
  expect(result).not.toBeNull();
  if (result === null) throw new Error('migration returned null');
  return result;
}

/** Every key of SaveData, so "no field is undefined" can be checked exhaustively. */
const SAVE_KEYS: ReadonlyArray<keyof SaveData> = [
  'schemaVersion',
  'purse',
  'moneyBox',
  'stage',
  'week',
  'bag',
  'bedroom',
  'foodMeter',
  'electricityDays',
  'savingGoal',
  'transactionLog',
  'coinErrors',
];

/* ---------------------------------------------------------------------------
 * the fixtures load at all
 * ------------------------------------------------------------------------- */

describe('v1 fixtures', () => {
  it.each(FIXTURE_NAMES)('%s is a readable v1 save', (name) => {
    const raw = loadFixture(name) as SaveDataV1;
    expect(raw.schemaVersion).toBe(1);
    expect(Array.isArray(raw.purse)).toBe(true);
    expect(Array.isArray(raw.transactionLog)).toBe(true);
    expect(raw.purse.every((coin) => isCoinValue(coin))).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
 * v1 -> v2 loses nothing
 * ------------------------------------------------------------------------- */

describe('migrateToCurrent: v1 -> v2 on real captured saves', () => {
  it.each(FIXTURE_NAMES)('%s becomes schemaVersion 2', (name) => {
    expect(migrated(loadFixture(name)).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated(loadFixture(name)).schemaVersion).toBe(2);
  });

  it.each(FIXTURE_NAMES)('%s keeps the purse byte-identical, coin for coin', (name) => {
    const raw = loadFixture(name) as SaveDataV1;
    const save = migrated(raw);
    expect(save.purse).toEqual(raw.purse);
    // Order matters too — she is holding these coins in this order.
    expect(save.purse.join(',')).toBe(raw.purse.join(','));
  });

  it.each(FIXTURE_NAMES)('%s preserves coinErrors exactly', (name) => {
    const raw = loadFixture(name) as SaveDataV1;
    const save = migrated(raw);
    expect(save.coinErrors).toEqual(raw.coinErrors);
    for (const coin of ALL_COIN_VALUES_LIST) {
      expect(save.coinErrors[coin]).toBe(raw.coinErrors[coin]);
    }
  });

  it.each(FIXTURE_NAMES)('%s carries the stage across', (name) => {
    const raw = loadFixture(name) as SaveDataV1;
    expect(migrated(raw).stage).toBe(raw.stage);
  });

  it.each(FIXTURE_NAMES)('%s keeps every log entry, with the right attempts', (name) => {
    const raw = loadFixture(name) as SaveDataV1;
    const save = migrated(raw);

    expect(save.transactionLog).toHaveLength(raw.transactionLog.length);
    save.transactionLog.forEach((entry, i) => {
      const before = raw.transactionLog[i];
      expect(before).toBeDefined();
      if (before === undefined) return;
      expect(entry.price).toBe(before.price);
      expect(entry.ts).toBe(before.ts);
      // v1 recorded only a boolean: right first go => 1 attempt, otherwise 2.
      expect(entry.attempts).toBe(before.correct ? 1 : 2);
      // v1 had no per-entry stage, so the save's own stage is used.
      expect(entry.stage).toBe(raw.stage);
    });
  });

  it.each(FIXTURE_NAMES)('%s leaves no field undefined', (name) => {
    const save = migrated(loadFixture(name)) as unknown as Record<string, unknown>;
    for (const key of SAVE_KEYS) {
      expect(save[key]).toBeDefined();
      expect(save[key]).not.toBeUndefined();
    }
    // savingGoal is legitimately null; nothing else may be.
    for (const key of SAVE_KEYS) {
      if (key === 'savingGoal') continue;
      expect(save[key]).not.toBeNull();
    }
  });

  it.each(FIXTURE_NAMES)('%s gets the v2 defaults for the new fields', (name) => {
    const save = migrated(loadFixture(name));
    expect(save.moneyBox).toEqual([]);
    expect(save.week).toBe(1);
    expect(save.bag).toEqual([]);
    expect(save.bedroom).toEqual([]);
    expect(save.foodMeter).toBe(0);
    expect(save.electricityDays).toBe(0);
    expect(save.savingGoal).toBeNull();
  });

  it('handles the specific simple fixture end to end', () => {
    const save = migrated(loadFixture('save-v1-simple.json'));
    expect(save.purse).toEqual([10, 10, 2, 2, 1]);
    expect(save.stage).toBe(1);
    expect(save.transactionLog).toEqual([
      { price: 5, attempts: 1, ts: 1785321333799, stage: 1 },
    ]);
    expect(save.coinErrors).toEqual(emptyCoinErrors());
  });

  it('handles the specific short-payment fixture end to end', () => {
    const save = migrated(loadFixture('save-v1-short.json'));
    expect(save.purse).toEqual([10, 10, 5, 2, 2, 1]);
    expect(save.transactionLog).toEqual([
      { price: 12, attempts: 2, ts: 1785322732569, stage: 1 },
    ]);
    expect(save.coinErrors[2]).toBe(1);
  });

  it('handles the richer stage-2 fixture, correct and incorrect alike', () => {
    const raw = loadFixture('save-v1-rich.json') as SaveDataV1;
    const save = migrated(raw);
    expect(save.stage).toBe(2);
    expect(save.transactionLog).toHaveLength(10);
    expect(save.transactionLog.every((entry) => entry.stage === 2)).toBe(true);

    const firstTime = save.transactionLog.filter((entry) => entry.attempts === 1).length;
    const wasCorrect = raw.transactionLog.filter((entry) => entry.correct).length;
    expect(firstTime).toBe(wasCorrect);
    expect(firstTime).toBe(7);
    expect(save.transactionLog.filter((entry) => entry.attempts === 2)).toHaveLength(3);

    expect(save.coinErrors[2]).toBe(3);
    expect(save.coinErrors[20]).toBe(2);
    expect(save.coinErrors[200]).toBe(0);
  });

  it('does not mutate the input object', () => {
    const raw = loadFixture('save-v1-rich.json');
    const snapshot = structuredClone(raw);
    migrateToCurrent(raw);
    expect(raw).toEqual(snapshot);
  });

  it('is idempotent — migrating the result again changes nothing', () => {
    for (const name of FIXTURE_NAMES) {
      const once = migrated(loadFixture(name));
      const twice = migrated(structuredClone(once));
      expect(twice).toEqual(once);
    }
  });
});

/* ---------------------------------------------------------------------------
 * v2 pass-through
 * ------------------------------------------------------------------------- */

describe('migrateToCurrent: v2 saves', () => {
  const v2: SaveData = {
    schemaVersion: 2,
    purse: [20, 10, 5],
    moneyBox: [50, 100],
    stage: 3,
    week: 9,
    bag: [{ itemId: 'toy_car', boughtWeek: 8 }],
    bedroom: ['stickers'],
    foodMeter: 2,
    electricityDays: 7,
    savingGoal: 'scooter',
    transactionLog: [{ price: 25, attempts: 1, ts: 1785492930118, stage: 3 }],
    coinErrors: { ...emptyCoinErrors(), 50: 4 },
  };

  it('passes a valid v2 save through unchanged', () => {
    expect(migrated(structuredClone(v2))).toEqual(v2);
  });

  it('repairs missing fields rather than nulling the save', () => {
    const partial = { schemaVersion: 2, purse: [10, 5], stage: 2 };
    const save = migrated(partial);
    expect(save.purse).toEqual([10, 5]);
    expect(save.stage).toBe(2);
    expect(save.moneyBox).toEqual([]);
    expect(save.week).toBe(1);
    expect(save.bag).toEqual([]);
    expect(save.bedroom).toEqual([]);
    expect(save.foodMeter).toBe(0);
    expect(save.electricityDays).toBe(0);
    expect(save.savingGoal).toBeNull();
    expect(save.transactionLog).toEqual([]);
    expect(save.coinErrors).toEqual(emptyCoinErrors());
  });

  it('ignores unknown extra fields', () => {
    const save = migrated({ ...structuredClone(v2), somethingNew: { a: 1 }, xp: 9000 });
    expect(save).toEqual(v2);
    expect(Object.keys(save).sort()).toEqual([...SAVE_KEYS].sort());
  });

  it('defaults an unknown stage to 1', () => {
    expect(migrated({ schemaVersion: 2, stage: 9 }).stage).toBe(1);
    expect(migrated({ schemaVersion: 2, stage: 'two' }).stage).toBe(1);
    expect(migrated({ schemaVersion: 2 }).stage).toBe(1);
  });

  it('clamps foodMeter to 0..3', () => {
    const cases: ReadonlyArray<readonly [unknown, number]> = [
      [-4, 0],
      [0, 0],
      [2, 2],
      [3, 3],
      [7, 3],
      ['3', 0],
      [null, 0],
    ];
    for (const [input, expected] of cases) {
      expect(migrated({ schemaVersion: 2, foodMeter: input }).foodMeter).toBe(expected);
    }
  });

  it('clamps electricityDays to 0..7', () => {
    const cases: ReadonlyArray<readonly [unknown, number]> = [
      [-1, 0],
      [0, 0],
      [7, 7],
      [99, 7],
      ['7', 0],
    ];
    for (const [input, expected] of cases) {
      expect(migrated({ schemaVersion: 2, electricityDays: input }).electricityDays).toBe(expected);
    }
  });

  it('coerces week to an integer >= 1', () => {
    const cases: ReadonlyArray<readonly [unknown, number]> = [
      [0, 1],
      [-12, 1],
      [1, 1],
      [37, 37],
      ['5', 1],
      [null, 1],
      [Number.NaN, 1],
    ];
    for (const [input, expected] of cases) {
      expect(migrated({ schemaVersion: 2, week: input }).week).toBe(expected);
    }
  });

  it('drops malformed log entries individually', () => {
    const save = migrated({
      schemaVersion: 2,
      stage: 2,
      transactionLog: [
        { price: 5, attempts: 1, ts: 1, stage: 2 },
        null,
        'nonsense',
        { attempts: 1, ts: 2 },
        { price: 'free', attempts: 1, ts: 3 },
        { price: 8, attempts: 1, ts: 4, stage: 2 },
      ],
    });
    expect(save.transactionLog).toHaveLength(2);
    expect(save.transactionLog.map((entry) => entry.price)).toEqual([5, 8]);
  });

  it('repairs a log entry with a valid price but nonsense elsewhere', () => {
    const save = migrated({
      schemaVersion: 2,
      stage: 3,
      transactionLog: [{ price: 12, attempts: 'lots', ts: 'yesterday', stage: 88 }],
    });
    // attempts defaults to 2, never 1 — a damaged record must not earn a promotion.
    expect(save.transactionLog).toEqual([{ price: 12, attempts: 2, ts: 0, stage: 3 }]);
  });

  it('repairs a coinErrors map with missing or nonsense counts', () => {
    const save = migrated({
      schemaVersion: 2,
      coinErrors: { '1': 3, '2': -1, '5': 'many', '999': 7 },
    });
    expect(save.coinErrors).toEqual({ ...emptyCoinErrors(), 1: 3 });
    expect(Object.keys(save.coinErrors)).toHaveLength(8);
  });

  it('drops malformed bag entries but keeps the good ones', () => {
    const save = migrated({
      schemaVersion: 2,
      bag: [{ itemId: 'apple', boughtWeek: 2 }, null, { boughtWeek: 3 }, { itemId: '', boughtWeek: 1 }, { itemId: 'roll' }],
    });
    expect(save.bag).toEqual([
      { itemId: 'apple', boughtWeek: 2 },
      { itemId: 'roll', boughtWeek: 1 },
    ]);
  });

  it('drops non-string bedroom entries', () => {
    const save = migrated({ schemaVersion: 2, bedroom: ['stickers', 3, null, '', 'bubbles'] });
    expect(save.bedroom).toEqual(['stickers', 'bubbles']);
  });

  it('nulls a non-string savingGoal', () => {
    expect(migrated({ schemaVersion: 2, savingGoal: 42 }).savingGoal).toBeNull();
    expect(migrated({ schemaVersion: 2, savingGoal: '' }).savingGoal).toBeNull();
    expect(migrated({ schemaVersion: 2, savingGoal: 'scooter' }).savingGoal).toBe('scooter');
  });
});

/* ---------------------------------------------------------------------------
 * corrupt and hostile input
 * ------------------------------------------------------------------------- */

describe('migrateToCurrent: corrupt input', () => {
  it('returns null for values that are not save objects', () => {
    const notSaves: unknown[] = [null, undefined, [], 'str', '', 0, 42, true, false, Number.NaN];
    for (const value of notSaves) {
      expect(migrateToCurrent(value)).toBeNull();
    }
  });

  it('returns null for an object with no usable schemaVersion', () => {
    expect(migrateToCurrent({})).toBeNull();
    expect(migrateToCurrent({ purse: [10, 5], stage: 1 })).toBeNull();
    expect(migrateToCurrent({ schemaVersion: '2' })).toBeNull();
    expect(migrateToCurrent({ schemaVersion: null })).toBeNull();
    expect(migrateToCurrent({ schemaVersion: 0 })).toBeNull();
    expect(migrateToCurrent({ schemaVersion: -1 })).toBeNull();
  });

  it('returns null for a save from a FUTURE schema rather than guessing', () => {
    const v3 = {
      schemaVersion: 3,
      purse: [10, 5],
      stage: 2,
      wallet: { balance: 250 },
      transactionLog: [],
      coinErrors: emptyCoinErrors(),
    };
    expect(migrateToCurrent(v3)).toBeNull();
    expect(migrateToCurrent({ schemaVersion: 4 })).toBeNull();
    expect(migrateToCurrent({ schemaVersion: 99 })).toBeNull();
  });

  it('drops coins that are not real denominations instead of losing the save', () => {
    // 3 is not a UK coin; 1.5 is not integer pence. Neither can be drawn, counted
    // or spent — but discarding her whole game over one bad element would be worse.
    const save = migrated({
      schemaVersion: 2,
      purse: [10, 3, 1.5, 5, '20', null, 200],
      moneyBox: [50, 0, -10, 7],
    });
    expect(save.purse).toEqual([10, 5, 200]);
    expect(save.moneyBox).toEqual([50]);
    expect(save.purse.every((coin: CoinValue) => isCoinValue(coin))).toBe(true);
    expect(save.moneyBox.every((coin: CoinValue) => isCoinValue(coin))).toBe(true);
  });

  it('drops bad coins out of a v1 purse too', () => {
    const save = migrated({
      schemaVersion: 1,
      purse: [10, 10, 3, 2, 1.5, 1],
      stage: 1,
      transactionLog: [],
      coinErrors: emptyCoinErrors(),
    });
    expect(save.purse).toEqual([10, 10, 2, 1]);
  });

  it('survives a v1 save whose log is not an array', () => {
    const save = migrated({
      schemaVersion: 1,
      purse: [5],
      stage: 1,
      transactionLog: 'oops',
      coinErrors: emptyCoinErrors(),
    });
    expect(save.transactionLog).toEqual([]);
    expect(save.purse).toEqual([5]);
  });

  it('survives a v1 save with a garbage stage and garbage log rows', () => {
    const save = migrated({
      schemaVersion: 1,
      purse: [2, 1],
      stage: 'hard',
      transactionLog: [{ price: 4, correct: true, ts: 10 }, 5, null],
      coinErrors: 'gone',
    });
    expect(save.stage).toBe(1);
    expect(save.transactionLog).toEqual([{ price: 4, attempts: 1, ts: 10, stage: 1 }]);
    expect(save.coinErrors).toEqual(emptyCoinErrors());
  });

  it('never throws, whatever it is handed', () => {
    const hostile: unknown[] = [
      { schemaVersion: 1 },
      { schemaVersion: 2, purse: 'coins' },
      { schemaVersion: 1, purse: null, transactionLog: [[]], coinErrors: [] },
      { schemaVersion: 2, transactionLog: [{ price: Number.POSITIVE_INFINITY }] },
      { schemaVersion: 2, bag: 'stuff', bedroom: 7 },
      { schemaVersion: 1.5 },
    ];
    for (const value of hostile) {
      expect(() => migrateToCurrent(value)).not.toThrow();
    }
  });

  it('rejects a non-integer schemaVersion', () => {
    expect(migrateToCurrent({ schemaVersion: 1.5 })).toBeNull();
  });

  it('always produces a valid stage and coin lists whenever it produces anything', () => {
    const inputs: unknown[] = [
      { schemaVersion: 1, purse: [1], stage: 1, transactionLog: [], coinErrors: {} },
      { schemaVersion: 2 },
      loadFixture('save-v1-rich.json'),
    ];
    const validStages: readonly Stage[] = [1, 2, 3, 4];
    for (const input of inputs) {
      const save = migrateToCurrent(input);
      expect(save).not.toBeNull();
      if (save === null) continue;
      expect(validStages).toContain(save.stage);
      expect(save.purse.every((coin) => isCoinValue(coin))).toBe(true);
      expect(save.moneyBox.every((coin) => isCoinValue(coin))).toBe(true);
      expect(Number.isInteger(save.week)).toBe(true);
    }
  });
});
