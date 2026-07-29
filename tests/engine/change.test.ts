/* =============================================================================
 * changeByCountingOn / checkPayment
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { CoinValue, Stage } from '../../src/engine/types';
import { coinsForStage } from '../../src/engine/coins';
import { totalOf } from '../../src/engine/money';
import { changeByCountingOn, checkPayment } from '../../src/engine/change';

const STAGES: readonly Stage[] = [1, 2, 3, 4];

describe('changeByCountingOn — the documented example', () => {
  it('35p paid with a 50p at stage 3 counts on 5 then 10', () => {
    expect(changeByCountingOn(35, 50, 3)).toEqual([5, 10]);
  });

  it('counts on to the next round 10p first', () => {
    // 47 -> 50 with a 3p is impossible (no 3p), so it takes 2 then bridges.
    expect(totalOf(changeByCountingOn(47, 100, 4))).toBe(53);
    // 45 -> 50 with a 5p, then strides.
    expect(changeByCountingOn(45, 100, 4)).toEqual([5, 50]);
    // 98 -> 100 with a 2p, then a whole pound.
    expect(changeByCountingOn(98, 200, 4)).toEqual([2, 100]);
  });

  it('needs no bridging coin when the price is already round', () => {
    expect(changeByCountingOn(30, 50, 3)).toEqual([20]);
    expect(changeByCountingOn(0, 10, 1)).toEqual([10]);
  });

  it('returns [] when nothing is owed', () => {
    for (const stage of STAGES) {
      expect(changeByCountingOn(50, 50, stage)).toEqual([]);
      expect(changeByCountingOn(50, 20, stage)).toEqual([]);
      expect(changeByCountingOn(0, 0, stage)).toEqual([]);
    }
  });
});

describe('changeByCountingOn — sums exactly, always', () => {
  for (const stage of STAGES) {
    it(`stage ${stage}: paying any price 0..100 with a single coin`, () => {
      const stageCoins = coinsForStage(stage);
      let checked = 0;
      for (let price = 0; price <= 100; price++) {
        for (const paid of stageCoins) {
          if (paid <= price) continue;
          const change = changeByCountingOn(price, paid, stage);
          expect(totalOf(change)).toBe(paid - price);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
    });

    it(`stage ${stage}: dense sweep of every price/paid pair up to 200p`, () => {
      const allowed = new Set<number>(coinsForStage(stage));
      const failures: string[] = [];
      for (let price = 0; price <= 120; price++) {
        for (let paid = price + 1; paid <= 200; paid++) {
          const change = changeByCountingOn(price, paid, stage);
          if (totalOf(change) !== paid - price) {
            failures.push(`price ${price} paid ${paid}: got ${totalOf(change)}`);
            continue;
          }
          for (const c of change) {
            if (!allowed.has(c)) failures.push(`price ${price} paid ${paid}: bad coin ${c}`);
            if (!Number.isInteger(c)) failures.push(`price ${price} paid ${paid}: non-integer`);
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it(`stage ${stage}: stays compact rather than dribbling out pennies`, () => {
      // Counting-on trades a little optimality for teachability, but it should
      // never degenerate into a fistful of 1p coins.
      for (let price = 0; price <= 120; price++) {
        for (let paid = price + 1; paid <= 200; paid++) {
          const change = changeByCountingOn(price, paid, stage);
          const pennies = change.filter((c) => c === 1).length;
          expect(pennies).toBeLessThanOrEqual(4);
          expect(change.length).toBeLessThanOrEqual(24);
        }
      }
    });
  }
});

describe('checkPayment', () => {
  it('reports a shortfall', () => {
    expect(checkPayment(50, [20, 10], 3)).toEqual({ kind: 'short', shortBy: 20 });
    expect(checkPayment(35, [], 3)).toEqual({ kind: 'short', shortBy: 35 });
    expect(checkPayment(1, [], 1)).toEqual({ kind: 'short', shortBy: 1 });
  });

  it('reports an exact payment', () => {
    expect(checkPayment(50, [20, 20, 10], 3)).toEqual({ kind: 'exact' });
    expect(checkPayment(0, [], 1)).toEqual({ kind: 'exact' });
    expect(checkPayment(200, [200], 4)).toEqual({ kind: 'exact' });
  });

  it('reports change due, counted on', () => {
    expect(checkPayment(35, [50], 3)).toEqual({
      kind: 'over',
      changeDue: 15,
      changeCoins: [5, 10],
    });
    const result = checkPayment(45, [100], 4);
    expect(result).toEqual({ kind: 'over', changeDue: 55, changeCoins: [5, 50] });
  });

  it('change coins always reconcile with change due', () => {
    for (const stage of STAGES) {
      const stageCoins = coinsForStage(stage);
      for (let price = 0; price <= 60; price++) {
        for (const a of stageCoins) {
          for (const b of stageCoins) {
            const result = checkPayment(price, [a, b], stage);
            if (result.kind === 'over') {
              expect(result.changeDue).toBe(a + b - price);
              expect(totalOf(result.changeCoins)).toBe(result.changeDue);
              expect(Number.isInteger(result.changeDue)).toBe(true);
            } else if (result.kind === 'short') {
              expect(result.shortBy).toBe(price - a - b);
            }
          }
        }
      }
    }
  });

  it('rejects a negative price and non-coin offerings', () => {
    expect(() => checkPayment(-1, [10], 1)).toThrow(TypeError);
    expect(() => checkPayment(10, [3 as unknown as CoinValue], 1)).toThrow(TypeError);
  });
});
