/* =============================================================================
 * Coin table and stage gating
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { CoinValue, Stage } from '../../src/engine/types';
import {
  ALL_COIN_VALUES,
  COIN_SPECS,
  COIN_SPEC_BY_VALUE,
  MM_TO_PX,
  coinDiameterPx,
  coinsForStage,
  isCoinValue,
  isStage,
} from '../../src/engine/coins';

describe('COIN_SPECS', () => {
  it('has all eight circulating denominations, ascending', () => {
    expect(COIN_SPECS.map((s) => s.value)).toEqual([1, 2, 5, 10, 20, 50, 100, 200]);
    expect(ALL_COIN_VALUES).toEqual([1, 2, 5, 10, 20, 50, 100, 200]);
  });

  it('matches the Royal Mint specification exactly', () => {
    const expected: ReadonlyArray<readonly [CoinValue, string, number, string, string]> = [
      [1, '1p', 20.3, 'circle', 'copper'],
      [2, '2p', 25.9, 'circle', 'copper'],
      [5, '5p', 18.0, 'circle', 'silver'],
      [10, '10p', 24.5, 'circle', 'silver'],
      [20, '20p', 21.4, 'heptagon', 'silver'],
      [50, '50p', 27.3, 'heptagon', 'silver'],
      [100, '£1', 23.4, 'dodecagon', 'bimetallic-gold-outer'],
      [200, '£2', 28.4, 'circle', 'bimetallic-silver-inner'],
    ];
    for (const [value, label, diameterMm, shape, colour] of expected) {
      const spec = COIN_SPEC_BY_VALUE[value];
      expect(spec).toEqual({ value, label, diameterMm, shape, colour });
    }
  });

  it('indexes every coin in COIN_SPEC_BY_VALUE', () => {
    for (const value of ALL_COIN_VALUES) {
      expect(COIN_SPEC_BY_VALUE[value].value).toBe(value);
    }
  });
});

describe('coinsForStage', () => {
  const expected: Record<Stage, CoinValue[]> = {
    1: [1, 2, 5, 10],
    2: [1, 2, 5, 10, 20],
    3: [1, 2, 5, 10, 20, 50],
    4: [1, 2, 5, 10, 20, 50, 100, 200],
  };

  for (const stage of [1, 2, 3, 4] as const) {
    it(`stage ${stage} unlocks exactly ${expected[stage].join(', ')}`, () => {
      expect(coinsForStage(stage)).toEqual(expected[stage]);
    });
  }

  it('returns a fresh array the caller can safely mutate', () => {
    const a = coinsForStage(2);
    a.sort((x, y) => y - x);
    expect(coinsForStage(2)).toEqual([1, 2, 5, 10, 20]);
  });

  it('always includes 1p, which guarantees every amount is payable', () => {
    for (const stage of [1, 2, 3, 4] as const) {
      expect(coinsForStage(stage)).toContain(1);
    }
  });

  it('rejects invalid stages', () => {
    expect(() => coinsForStage(0 as Stage)).toThrow(TypeError);
    expect(() => coinsForStage(5 as Stage)).toThrow(TypeError);
    expect(() => coinsForStage(2.5 as Stage)).toThrow(TypeError);
    expect(() => coinsForStage(NaN as unknown as Stage)).toThrow(TypeError);
  });
});

describe('type guards', () => {
  it('isStage', () => {
    expect([1, 2, 3, 4].every(isStage)).toBe(true);
    expect([0, 5, 1.5, NaN, '1', null, undefined].some(isStage)).toBe(false);
  });

  it('isCoinValue', () => {
    expect([1, 2, 5, 10, 20, 50, 100, 200].every(isCoinValue)).toBe(true);
    expect([0, 3, 25, 500, 1.5, NaN, '5', null].some(isCoinValue)).toBe(false);
  });
});

describe('coinDiameterPx', () => {
  it('scales millimetres by MM_TO_PX', () => {
    expect(MM_TO_PX).toBe(3.2);
    expect(coinDiameterPx(1)).toBeCloseTo(20.3 * 3.2, 10);
    expect(coinDiameterPx(200)).toBeCloseTo(28.4 * 3.2, 10);
  });

  it('applies the scale factor', () => {
    expect(coinDiameterPx(10, 2)).toBeCloseTo(coinDiameterPx(10) * 2, 10);
    expect(coinDiameterPx(10, 0.5)).toBeCloseTo(coinDiameterPx(10) / 2, 10);
  });

  it('preserves the real-world size ordering (5p is the smallest coin)', () => {
    const sizes = ALL_COIN_VALUES.map((v) => coinDiameterPx(v));
    const smallest = Math.min(...sizes);
    expect(coinDiameterPx(5)).toBe(smallest);
    expect(coinDiameterPx(200)).toBe(Math.max(...sizes));
  });

  it('rejects non-coins and non-finite scales', () => {
    expect(() => coinDiameterPx(3 as unknown as CoinValue)).toThrow(TypeError);
    expect(() => coinDiameterPx(10, NaN)).toThrow(TypeError);
    expect(() => coinDiameterPx(10, Infinity)).toThrow(TypeError);
  });
});
