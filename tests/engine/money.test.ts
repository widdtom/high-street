/* =============================================================================
 * formatMoney / totalOf / canMakeExactly* / allCombinations
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { CoinValue, Stage } from '../../src/engine/types';
import { coinsForStage } from '../../src/engine/coins';
import {
  allCombinations,
  canMakeExactly,
  canMakeExactlyFrom,
  formatMoney,
  totalOf,
} from '../../src/engine/money';

const STAGES: readonly Stage[] = [1, 2, 3, 4];

describe('formatMoney', () => {
  const cases: ReadonlyArray<readonly [number, Stage, string]> = [
    // Stages 1-3 are always pence, numerals only, even past £1.
    [0, 1, '0p'],
    [0, 2, '0p'],
    [0, 3, '0p'],
    [1, 1, '1p'],
    [45, 1, '45p'],
    [45, 2, '45p'],
    [45, 3, '45p'],
    [99, 3, '99p'],
    [100, 1, '100p'],
    [100, 2, '100p'],
    [100, 3, '100p'],
    [250, 3, '250p'],
    // Stage 4 crosses over to pounds at exactly 100p.
    [0, 4, '0p'],
    [5, 4, '5p'],
    [20, 4, '20p'],
    [99, 4, '99p'],
    [100, 4, '£1.00'],
    [101, 4, '£1.01'],
    [110, 4, '£1.10'],
    [120, 4, '£1.20'],
    [199, 4, '£1.99'],
    [200, 4, '£2.00'],
    [1005, 4, '£10.05'],
    // Negatives keep their sign.
    [-5, 1, '-5p'],
    [-5, 4, '-5p'],
    [-120, 3, '-120p'],
    [-120, 4, '-£1.20'],
    [-100, 4, '-£1.00'],
  ];

  for (const [pence, stage, expected] of cases) {
    it(`${pence}p at stage ${stage} => ${expected}`, () => {
      expect(formatMoney(pence, stage)).toBe(expected);
    });
  }

  it('never emits number words, only numerals', () => {
    for (const stage of STAGES) {
      for (let p = 0; p <= 300; p++) {
        expect(formatMoney(p, stage)).toMatch(/^(£\d+\.\d{2}|\d+p)$/);
      }
    }
  });

  it('always pads pence to two digits at stage 4', () => {
    for (let p = 100; p <= 300; p++) {
      const s = formatMoney(p, 4);
      expect(s.split('.')[1]).toHaveLength(2);
    }
  });
});

describe('totalOf', () => {
  it('sums coins and returns 0 for none', () => {
    expect(totalOf([])).toBe(0);
    expect(totalOf([1])).toBe(1);
    expect(totalOf([50, 20, 20, 5, 2, 2])).toBe(99);
    expect(totalOf([200, 200, 100])).toBe(500);
  });

  it('is order-insensitive', () => {
    expect(totalOf([5, 10, 2])).toBe(totalOf([2, 5, 10]));
  });

  it('rejects values that are not coins', () => {
    expect(() => totalOf([3 as unknown as CoinValue])).toThrow(TypeError);
    expect(() => totalOf([1.5 as unknown as CoinValue])).toThrow(TypeError);
  });
});

describe('canMakeExactlyFrom', () => {
  it('the {1,5} probe: 3 and 6 are BOTH reachable', () => {
    // NOTE: the brief asked for canMakeExactlyFrom(3, [1,5]) === false, but that
    // is arithmetically impossible: 3 = 1+1+1. Once a 1p is in the set every
    // non-negative amount is reachable. The unreachable case needs 1p removed.
    expect(canMakeExactlyFrom(3, [1, 5])).toBe(true);
    expect(canMakeExactlyFrom(6, [1, 5])).toBe(true);
    // Drop the 1p and 3 genuinely becomes unreachable, which is the property
    // the brief was reaching for.
    expect(canMakeExactlyFrom(3, [5])).toBe(false);
    expect(canMakeExactlyFrom(3, [5, 10, 20])).toBe(false);
  });

  it('returns false when no combination lands exactly', () => {
    expect(canMakeExactlyFrom(3, [2])).toBe(false);
    expect(canMakeExactlyFrom(3, [2, 10])).toBe(false);
    expect(canMakeExactlyFrom(7, [2, 10, 20])).toBe(false);
    expect(canMakeExactlyFrom(1, [5, 10])).toBe(false);
    expect(canMakeExactlyFrom(30, [])).toBe(false);
  });

  it('returns true when a combination exists', () => {
    expect(canMakeExactlyFrom(4, [2])).toBe(true);
    expect(canMakeExactlyFrom(12, [2, 10])).toBe(true);
    expect(canMakeExactlyFrom(30, [20, 10])).toBe(true);
    expect(canMakeExactlyFrom(0, [])).toBe(true);
  });

  it('0 is always reachable, negatives never are', () => {
    expect(canMakeExactlyFrom(0, [1, 2, 5])).toBe(true);
    expect(canMakeExactlyFrom(-1, [1, 2, 5])).toBe(false);
    expect(canMakeExactlyFrom(-100, [1])).toBe(false);
  });
});

describe('canMakeExactly (real stages)', () => {
  it('every amount 0..300 is payable at every stage, because 1p always exists', () => {
    for (const stage of STAGES) {
      for (let v = 0; v <= 300; v++) {
        expect(canMakeExactly(v, stage)).toBe(true);
      }
    }
  });

  it('rejects negatives', () => {
    for (const stage of STAGES) {
      expect(canMakeExactly(-1, stage)).toBe(false);
    }
  });
});

describe('allCombinations', () => {
  const key = (c: readonly CoinValue[]): string => c.join(',');

  it('target 0 gives exactly one empty combination', () => {
    for (const stage of STAGES) {
      expect(allCombinations(0, stage, 10)).toEqual([[]]);
      expect(allCombinations(0, stage, 1)).toEqual([[]]);
    }
  });

  it('limit <= 0 gives nothing', () => {
    expect(allCombinations(10, 1, 0)).toEqual([]);
    expect(allCombinations(10, 1, -5)).toEqual([]);
    expect(allCombinations(0, 1, 0)).toEqual([]);
  });

  it('10p at stage 1: no duplicates, all sum to 10, all descending, all valid coins', () => {
    const combos = allCombinations(10, 1, 1000);
    const allowed = new Set<number>(coinsForStage(1));

    expect(combos.length).toBeGreaterThan(1);
    expect(new Set(combos.map(key)).size).toBe(combos.length);

    for (const combo of combos) {
      expect(totalOf(combo)).toBe(10);
      for (const c of combo) expect(allowed.has(c)).toBe(true);
      for (let i = 1; i < combo.length; i++) {
        const prev = combo[i - 1];
        const cur = combo[i];
        expect(prev !== undefined && cur !== undefined && prev >= cur).toBe(true);
      }
    }
  });

  it('10p at stage 1 finds every partition of 10 into {1,2,5,10}', () => {
    // Enumerated by hand: 11 distinct multisets.
    const combos = allCombinations(10, 1, 1000);
    expect(combos.length).toBe(11);
    expect(combos[0]).toEqual([10]);
  });

  it('is order-insensitive: results are canonical descending multisets', () => {
    const combos = allCombinations(7, 1, 1000).map(key);
    expect(combos).toContain('5,2');
    expect(combos).not.toContain('2,5');
  });

  it('respects the limit and stays deterministic', () => {
    const full = allCombinations(50, 3, 1000);
    for (const limit of [1, 2, 3, 7, 25]) {
      const capped = allCombinations(50, 3, limit);
      expect(capped.length).toBe(Math.min(limit, full.length));
      expect(capped.map(key)).toEqual(full.slice(0, capped.length).map(key));
    }
  });

  it('returns identical output on repeated calls', () => {
    expect(allCombinations(35, 3, 40)).toEqual(allCombinations(35, 3, 40));
  });

  it('orders fewest coins first', () => {
    for (const stage of STAGES) {
      const combos = allCombinations(30, stage, 500);
      for (let i = 1; i < combos.length; i++) {
        const prev = combos[i - 1];
        const cur = combos[i];
        expect(prev !== undefined && cur !== undefined && prev.length <= cur.length).toBe(true);
      }
    }
  });

  it('every combination at every stage sums to the target', () => {
    for (const stage of STAGES) {
      for (const target of [1, 5, 17, 40, 63, 100]) {
        for (const combo of allCombinations(target, stage, 60)) {
          expect(totalOf(combo)).toBe(target);
        }
      }
    }
  });

  it('negative targets give nothing', () => {
    expect(allCombinations(-5, 2, 10)).toEqual([]);
  });
});
