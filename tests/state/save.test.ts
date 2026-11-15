import { describe, expect, it } from 'vitest';
import { brandNewSave, exportSave, importSave } from '../../src/state/save';
import {
  CURRENT_SCHEMA_VERSION,
  emptyCoinErrors,
  freshSave,
  type SaveData,
} from '../../src/state/saveTypes';

const RICH: SaveData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  purse: [1, 2, 5, 10, 20, 50, 100, 200],
  moneyBox: [50, 50],
  stage: 3,
  week: 7,
  bag: [
    { itemId: 'loaf', boughtWeek: 6 },
    { itemId: 'small_teddy', boughtWeek: 7 },
  ],
  bedroom: ['small_teddy'],
  foodMeter: 2,
  electricityDays: 7,
  savingGoal: 'scooter',
  transactionLog: [
    { price: 12, attempts: 1, ts: 1700000000000, stage: 2 },
    { price: 50, attempts: 3, ts: 1700000001000, stage: 3 },
  ],
  coinErrors: { ...emptyCoinErrors(), 5: 3, 20: 1 },
  shiftWeek: 6,
};

describe('save export/import', () => {
  it('round-trips a full current save exactly', () => {
    const result = importSave(exportSave(RICH));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(RICH);
  });

  it('round-trips a fresh save', () => {
    const result = importSave(exportSave(freshSave()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(freshSave());
  });

  it('keeps the money box, bag, bedroom and week through a round trip', () => {
    const result = importSave(exportSave(RICH));
    if (!result.ok) throw new Error('expected a successful import');
    expect(result.data.moneyBox).toEqual([50, 50]);
    expect(result.data.bag).toEqual(RICH.bag);
    expect(result.data.bedroom).toEqual(['small_teddy']);
    expect(result.data.week).toBe(7);
    expect(result.data.savingGoal).toBe('scooter');
    expect(result.data.foodMeter).toBe(2);
  });

  it('rejects text that is not JSON without throwing', () => {
    expect(importSave('this is not a save file').ok).toBe(false);
    expect(importSave('').ok).toBe(false);
  });

  it('rejects JSON that is not a save shape', () => {
    expect(importSave('[1,2,3]').ok).toBe(false);
    expect(importSave('"hello"').ok).toBe(false);
    expect(importSave('null').ok).toBe(false);
  });

  it('accepts a v1 save and upgrades it', () => {
    const v1 = {
      schemaVersion: 1,
      purse: [10, 10, 5],
      stage: 2,
      transactionLog: [{ price: 5, correct: true, ts: 1 }],
      coinErrors: emptyCoinErrors(),
    };
    const result = importSave(JSON.stringify(v1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.schemaVersion).toBe(3);
    expect(result.data.shiftWeek).toBeNull();
    expect(result.data.purse).toEqual([10, 10, 5]);
    expect(result.data.stage).toBe(2);
    expect(result.data.week).toBe(1);
    expect(result.data.transactionLog[0]?.attempts).toBe(1);
  });

  it('refuses a save from a newer schema rather than guessing', () => {
    const future = { ...RICH, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(importSave(JSON.stringify(future)).ok).toBe(false);
  });

  it("a brand new save has nothing in it but week 1's income", () => {
    const s = brandNewSave();
    expect(s.week).toBe(1);
    expect(s.bag).toEqual([]);
    expect(s.bedroom).toEqual([]);
    expect(s.moneyBox).toEqual([]);
    expect(s.savingGoal).toBeNull();
    expect(s.transactionLog).toEqual([]);
    expect(s.coinErrors).toEqual(emptyCoinErrors());
    expect(s.shiftWeek).toBeNull();
    // 30p pocket money, already in her purse so that a reload during the
    // Saturday ceremony cannot pay her twice.
    expect(s.purse.reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('holds coins, not balances', () => {
    const s = freshSave();
    expect(Array.isArray(s.purse)).toBe(true);
    expect(Array.isArray(s.moneyBox)).toBe(true);
  });
});
