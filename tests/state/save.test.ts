import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  emptyCoinErrors,
  exportSave,
  freshSave,
  importSave,
  type SaveData,
} from '../../src/state/save';

describe('save export/import', () => {
  it('round-trips a save exactly', () => {
    const original: SaveData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      purse: [1, 2, 5, 10, 20, 50, 100, 200],
      stage: 3,
      transactionLog: [
        { price: 12, correct: true, ts: 1700000000000 },
        { price: 5, correct: false, ts: 1700000001000 },
      ],
      coinErrors: { ...emptyCoinErrors(), 5: 3, 20: 1 },
    };

    const result = importSave(exportSave(original));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(original);
  });

  it('round-trips a fresh save', () => {
    const result = importSave(exportSave(freshSave()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(freshSave());
  });

  it('rejects text that is not JSON without throwing', () => {
    const result = importSave('this is not a save file');
    expect(result.ok).toBe(false);
  });

  it('rejects JSON that is not a save shape', () => {
    expect(importSave('[1,2,3]').ok).toBe(false);
    expect(importSave('"hello"').ok).toBe(false);
    expect(importSave('null').ok).toBe(false);
    expect(importSave('{"purse":"not an array"}').ok).toBe(false);
  });

  it('rejects a purse containing values that are not real coins', () => {
    expect(importSave(JSON.stringify({ schemaVersion: 1, purse: [3] })).ok).toBe(false);
    expect(importSave(JSON.stringify({ schemaVersion: 1, purse: [1.5] })).ok).toBe(false);
  });

  it('refuses a save from a newer schema rather than guessing', () => {
    const future = { ...freshSave(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(importSave(JSON.stringify(future)).ok).toBe(false);
  });

  it('repairs a save with a missing log and coin errors', () => {
    const result = importSave(JSON.stringify({ schemaVersion: 1, purse: [10, 5], stage: 2 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.transactionLog).toEqual([]);
    expect(result.data.coinErrors).toEqual(emptyCoinErrors());
    expect(result.data.purse).toEqual([10, 5]);
    expect(result.data.stage).toBe(2);
  });

  it('drops malformed log entries but keeps good ones', () => {
    const result = importSave(
      JSON.stringify({
        schemaVersion: 1,
        purse: [],
        transactionLog: [
          { price: 5, correct: true, ts: 1 },
          { price: 'five', correct: true, ts: 2 },
          null,
          { price: 7, correct: false, ts: 3 },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.transactionLog).toEqual([
      { price: 5, correct: true, ts: 1 },
      { price: 7, correct: false, ts: 3 },
    ]);
  });

  it('holds coins, not a balance', () => {
    const save = freshSave();
    expect(Array.isArray(save.purse)).toBe(true);
    expect(save.purse.reduce((a, b) => a + b, 0)).toBe(30);
  });
});
