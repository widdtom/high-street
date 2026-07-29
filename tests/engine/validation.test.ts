/* =============================================================================
 * THE FLOAT FIREWALL
 * Money is integer pence. Every entry point rejects fractional, NaN and
 * infinite amounts, and no function ever hands one back.
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { CoinValue, Pence, Stage } from '../../src/engine/types';
import { coinsForStage } from '../../src/engine/coins';
import {
  allCombinations,
  assertPence,
  canMakeExactly,
  canMakeExactlyFrom,
  formatMoney,
  minimumCoins,
  totalOf,
} from '../../src/engine/money';
import { changeByCountingOn, checkPayment } from '../../src/engine/change';

const STAGES: readonly Stage[] = [1, 2, 3, 4];
const BAD_PENCE: readonly Pence[] = [
  1.5,
  -1.5,
  0.1,
  99.999,
  NaN,
  Infinity,
  -Infinity,
  '10' as unknown as Pence,
  null as unknown as Pence,
  undefined as unknown as Pence,
];
const BAD_STAGES: readonly Stage[] = [
  0 as Stage,
  5 as Stage,
  -1 as Stage,
  2.5 as Stage,
  NaN as unknown as Stage,
  '3' as unknown as Stage,
  null as unknown as Stage,
];

describe('assertPence', () => {
  it('accepts integers, including zero and negatives', () => {
    for (const good of [0, 1, -1, 200, -200, 999999]) {
      expect(() => assertPence(good)).not.toThrow();
    }
  });

  it('throws a TypeError on anything fractional or non-finite', () => {
    for (const bad of BAD_PENCE) {
      expect(() => assertPence(bad)).toThrow(TypeError);
    }
  });

  it('throws outside the safe integer range', () => {
    expect(() => assertPence(Number.MAX_SAFE_INTEGER + 2)).toThrow(TypeError);
  });
});

describe('every Pence-taking export rejects non-integers', () => {
  for (const bad of BAD_PENCE) {
    it(`rejects ${String(bad)}`, () => {
      expect(() => formatMoney(bad, 1)).toThrow(TypeError);
      expect(() => canMakeExactly(bad, 1)).toThrow(TypeError);
      expect(() => canMakeExactlyFrom(bad, [1, 2])).toThrow(TypeError);
      expect(() => minimumCoins(bad, 1)).toThrow(TypeError);
      expect(() => allCombinations(bad, 1, 10)).toThrow(TypeError);
      expect(() => allCombinations(10, 1, bad)).toThrow(TypeError);
      expect(() => changeByCountingOn(bad, 100, 1)).toThrow(TypeError);
      expect(() => changeByCountingOn(10, bad, 1)).toThrow(TypeError);
      expect(() => checkPayment(bad, [10], 1)).toThrow(TypeError);
    });
  }
});

describe('every Stage-taking export rejects invalid stages', () => {
  for (const bad of BAD_STAGES) {
    it(`rejects stage ${String(bad)}`, () => {
      expect(() => formatMoney(10, bad)).toThrow(TypeError);
      expect(() => canMakeExactly(10, bad)).toThrow(TypeError);
      expect(() => minimumCoins(10, bad)).toThrow(TypeError);
      expect(() => allCombinations(10, bad, 5)).toThrow(TypeError);
      expect(() => changeByCountingOn(10, 50, bad)).toThrow(TypeError);
      expect(() => checkPayment(10, [50], bad)).toThrow(TypeError);
    });
  }
});

describe('coin-list-taking exports reject non-coins', () => {
  const badCoins: readonly CoinValue[] = [
    3 as CoinValue,
    0 as CoinValue,
    1.5 as unknown as CoinValue,
    NaN as unknown as CoinValue,
    500 as CoinValue,
  ];

  for (const bad of badCoins) {
    it(`rejects coin ${String(bad)}`, () => {
      expect(() => totalOf([bad])).toThrow(TypeError);
      expect(() => canMakeExactlyFrom(10, [bad])).toThrow(TypeError);
      expect(() => checkPayment(10, [bad], 1)).toThrow(TypeError);
    });
  }

  it('rejects non-arrays', () => {
    expect(() => totalOf('10' as unknown as CoinValue[])).toThrow(TypeError);
    expect(() => checkPayment(10, null as unknown as CoinValue[], 1)).toThrow(TypeError);
  });
});

describe('no money function ever returns a non-integer', () => {
  it('sweeps every export across every stage', () => {
    const offenders: string[] = [];
    const check = (label: string, values: readonly number[]): void => {
      for (const v of values) {
        if (!Number.isInteger(v)) offenders.push(`${label}: ${String(v)}`);
      }
    };

    for (const stage of STAGES) {
      const stageCoins = coinsForStage(stage);
      check(`coinsForStage(${stage})`, stageCoins);

      for (let target = 0; target <= 200; target++) {
        const min = minimumCoins(target, stage);
        check(`minimumCoins(${target},${stage})`, min);
        check(`totalOf(minimumCoins(${target},${stage}))`, [totalOf(min)]);

        for (const combo of allCombinations(target, stage, 5)) {
          check(`allCombinations(${target},${stage})`, combo);
          check(`allCombinations total`, [totalOf(combo)]);
        }
      }

      for (let price = 0; price <= 100; price++) {
        for (const paid of stageCoins) {
          check(`changeByCountingOn(${price},${paid},${stage})`, changeByCountingOn(price, paid, stage));

          const result = checkPayment(price, [paid], stage);
          if (result.kind === 'short') check('checkPayment.shortBy', [result.shortBy]);
          if (result.kind === 'over') {
            check('checkPayment.changeDue', [result.changeDue]);
            check('checkPayment.changeCoins', result.changeCoins);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('formatMoney is the only place a decimal point ever appears', () => {
    // And even there it is built from integer arithmetic, never float division.
    expect(formatMoney(1, 4)).toBe('1p');
    expect(formatMoney(100, 4)).toBe('£1.00');
    // 0.1 + 0.2 style drift is impossible because there is no float maths.
    expect(formatMoney(10 + 20, 4)).toBe('30p');
    expect(formatMoney(110 + 20, 4)).toBe('£1.30');
  });
});

describe('barrel exports everything', () => {
  it('re-exports the full public surface', async () => {
    const engine = await import('../../src/engine/index');
    const expectedNames = [
      'COIN_SPECS',
      'COIN_SPEC_BY_VALUE',
      'ALL_COIN_VALUES',
      'MM_TO_PX',
      'coinsForStage',
      'coinDiameterPx',
      'isStage',
      'isCoinValue',
      'assertStage',
      'assertCoinValue',
      'formatMoney',
      'totalOf',
      'canMakeExactly',
      'canMakeExactlyFrom',
      'minimumCoins',
      'allCombinations',
      'assertPence',
      'changeByCountingOn',
      'checkPayment',
    ];
    for (const name of expectedNames) {
      expect(Object.keys(engine)).toContain(name);
    }
  });
});
