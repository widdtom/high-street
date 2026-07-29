/* =============================================================================
 * HEADLINE PROPERTY TEST
 *
 * `minimumCoins` is greedy: take the biggest coin that fits, repeat. Greedy is
 * only optimal for a "canonical" coin system, and this test is the proof that
 * every UK stage is canonical — for EVERY amount 1..200p at EVERY stage 1..4,
 * the greedy answer uses exactly as many coins as a brute-force dynamic
 * programme, and sums to the target.
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { CoinValue, Stage } from '../../src/engine/types';
import { coinsForStage } from '../../src/engine/coins';
import { minimumCoins, totalOf } from '../../src/engine/money';

const STAGES: readonly Stage[] = [1, 2, 3, 4];
const MAX_PENCE = 200;

/** Brute-force optimal coin count by DP. Unbounded supply of each denomination. */
function bruteForceMinCoinCount(target: number, coins: readonly CoinValue[]): number {
  const INF = Number.POSITIVE_INFINITY;
  const dp = new Array<number>(target + 1).fill(INF);
  dp[0] = 0;
  for (let amount = 1; amount <= target; amount++) {
    let best = INF;
    for (const coin of coins) {
      if (coin > amount) continue;
      const prev = dp[amount - coin];
      if (prev !== undefined && prev + 1 < best) best = prev + 1;
    }
    dp[amount] = best;
  }
  const answer = dp[target];
  return answer === undefined ? INF : answer;
}

describe('minimumCoins is optimal for every UK stage (greedy == DP)', () => {
  for (const stage of STAGES) {
    it(`stage ${stage}: greedy matches brute force for 1..${MAX_PENCE}p`, () => {
      const coins = coinsForStage(stage);
      const mismatches: string[] = [];

      for (let value = 1; value <= MAX_PENCE; value++) {
        const greedy = minimumCoins(value, stage);
        const optimal = bruteForceMinCoinCount(value, coins);

        if (totalOf(greedy) !== value) {
          mismatches.push(`${value}p: greedy sums to ${totalOf(greedy)}`);
          continue;
        }
        if (greedy.length !== optimal) {
          mismatches.push(`${value}p: greedy used ${greedy.length}, optimal is ${optimal}`);
        }
      }

      expect(mismatches).toEqual([]);
    });

    it(`stage ${stage}: results are descending, valid coins, integers`, () => {
      const allowed = new Set<number>(coinsForStage(stage));
      for (let value = 1; value <= MAX_PENCE; value++) {
        const coins = minimumCoins(value, stage);
        for (const c of coins) {
          expect(allowed.has(c)).toBe(true);
          expect(Number.isInteger(c)).toBe(true);
        }
        for (let i = 1; i < coins.length; i++) {
          const prev = coins[i - 1];
          const cur = coins[i];
          expect(prev !== undefined && cur !== undefined && prev >= cur).toBe(true);
        }
      }
    });
  }
});

describe('minimumCoins edge cases', () => {
  it('returns [] for 0 and for negatives', () => {
    for (const stage of STAGES) {
      expect(minimumCoins(0, stage)).toEqual([]);
      expect(minimumCoins(-1, stage)).toEqual([]);
      expect(minimumCoins(-250, stage)).toEqual([]);
    }
  });

  it('picks the obvious coins for familiar amounts', () => {
    expect(minimumCoins(37, 3)).toEqual([20, 10, 5, 2]);
    expect(minimumCoins(99, 3)).toEqual([50, 20, 20, 5, 2, 2]);
    expect(minimumCoins(200, 4)).toEqual([200]);
    expect(minimumCoins(100, 1)).toEqual(new Array<number>(10).fill(10));
  });
});
