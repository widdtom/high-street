/* =============================================================================
 * MONEY ARITHMETIC — INTEGER PENCE ONLY
 * Every amount here is a whole number of pence. There is no float arithmetic in
 * this file and there must never be. Pounds-and-pence strings are produced by
 * formatMoney() alone, which is a DISPLAY function and must never feed back
 * into a calculation.
 * ============================================================================= */

import type { CoinValue, Pence, Stage } from './types';
import { assertCoinValue, assertStage, coinsForStage } from './coins';

/**
 * Throws a TypeError unless `value` is a safe integer number of pence.
 * Rejects 1.5, NaN, Infinity, -Infinity, and non-numbers.
 */
export function assertPence(value: Pence, label = 'amount'): void {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer number of pence; received ${String(value)}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${label} is outside the safe integer range: ${String(value)}`);
  }
}

/** Throws a TypeError unless every element of `coins` is a circulating denomination. */
function assertCoinList(coins: CoinValue[], label = 'coins'): void {
  if (!Array.isArray(coins)) {
    throw new TypeError(`${label} must be an array of coin values`);
  }
  for (const c of coins) {
    assertCoinValue(c);
  }
}

/**
 * Render `pence` for the player.
 *
 * Stages 1-3 always speak in pence: `0p`, `45p`, `100p`, `250p`.
 * Stage 4 introduces pounds: anything of magnitude >= 100p renders as
 * `£1.20` / `£2.00`, anything smaller stays as `20p`.
 * Negatives keep the sign in front: `-5p`, `-£1.20`.
 *
 * DISPLAY ONLY. Never parse this back, never compute with it.
 */
export function formatMoney(pence: Pence, stage: Stage): string {
  assertPence(pence, 'pence');
  assertStage(stage);

  const negative = pence < 0;
  const abs = negative ? -pence : pence;
  const sign = negative ? '-' : '';

  if (stage < 4 || abs < 100) {
    return `${sign}${abs}p`;
  }

  // Exact integer division: `abs - remainder` is always a multiple of 100.
  const remainder = abs % 100;
  const pounds = (abs - remainder) / 100;
  const pennies = remainder < 10 ? `0${remainder}` : `${remainder}`;
  return `${sign}£${pounds}.${pennies}`;
}

/** Sum of a handful of coins, in pence. Empty array => 0. */
export function totalOf(coins: CoinValue[]): Pence {
  assertCoinList(coins);
  let total = 0;
  for (const c of coins) {
    total += c;
  }
  return total;
}

/**
 * Can `target` be made exactly from `coins`, using each coin in the list AT
 * MOST ONCE?
 *
 * `coins` is a finite multiset — a purse, the actual coins she is holding —
 * not a denomination set with unlimited supply. That distinction is the whole
 * point of this function: a purse of [1, 20] cannot make 2p, even though the
 * denominations {1, 20} could if pennies were unlimited.
 *
 * This replaces the old `canMakeExactly(target, stage)`, which could only ever
 * return true because 1p is available at every stage.
 *
 * target 0 => true (pay with nothing). Negative target => false.
 */
export function canMakeExactlyFrom(target: Pence, coins: readonly CoinValue[]): boolean {
  assertPence(target, 'target');
  for (const c of coins) {
    assertCoinValue(c);
  }
  if (target < 0) return false;
  if (target === 0) return true;
  if (coins.length === 0) return false;

  // 0/1 subset-sum over the multiset: walk each amount downward so a coin is
  // never spent twice.
  const reachable = new Array<boolean>(target + 1).fill(false);
  reachable[0] = true;
  for (const c of coins) {
    for (let amount = target; amount >= c; amount -= 1) {
      if (reachable[amount - c] === true) reachable[amount] = true;
    }
  }
  return reachable[target] === true;
}

/**
 * Fewest coins that make `target` at `stage`, largest first (DESCENDING).
 *
 * Greedy largest-first. UK denominations are a canonical coin system at every
 * stage, so greedy is provably optimal here — the property test in
 * tests/engine/greedy.test.ts checks that against a brute-force DP for every
 * value 1..200 at every stage.
 *
 * Returns [] for target 0. Also returns [] if `target` is not representable at
 * this stage (impossible with real UK stages, since 1p is always available) or
 * if `target` is negative.
 */
export function minimumCoins(target: Pence, stage: Stage): CoinValue[] {
  assertPence(target, 'target');
  assertStage(stage);
  if (target <= 0) return [];

  const descending = coinsForStage(stage).sort((a, b) => b - a);
  const out: CoinValue[] = [];
  let remaining = target;
  for (const coin of descending) {
    while (remaining >= coin) {
      out.push(coin);
      remaining -= coin;
    }
  }
  // Greedy failed to land exactly => target is unreachable at this stage.
  return remaining === 0 ? out : [];
}

/**
 * Every distinct way to make `target` from the coins at `stage`, as multisets.
 *
 * Each combination is canonicalised descending, so [10,5,5] and [5,10,5] are the
 * same result and appear once. Results are ordered fewest-coins-first, and
 * within an equal coin count by largest-coin-first depth-first order — fully
 * deterministic and stable across runs.
 *
 * `limit` caps the number of results (generation stops early; it does not
 * enumerate everything and slice). limit <= 0 => []. target 0 => [[]].
 */
export function allCombinations(target: Pence, stage: Stage, limit: number): CoinValue[][] {
  assertPence(target, 'target');
  assertStage(stage);
  assertPence(limit, 'limit');
  if (limit <= 0) return [];
  if (target < 0) return [];
  if (target === 0) return [[]];

  const descending = coinsForStage(stage).sort((a, b) => b - a);
  const largest = descending[0];
  const smallest = descending[descending.length - 1];
  if (largest === undefined || smallest === undefined) return [];

  const out: CoinValue[][] = [];
  const minSlots = Math.ceil(target / largest);
  const maxSlots = Math.floor(target / smallest);

  // Iterative deepening on coin count gives fewest-coins-first for free while
  // still allowing us to stop the moment `limit` results exist.
  for (let slots = minSlots; slots <= maxSlots && out.length < limit; slots++) {
    enumerateOfSize(target, slots, 0, descending, smallest, [], out, limit);
  }
  return out;
}

/** DFS over non-increasing coin sequences of exactly `slots` coins summing to `remaining`. */
function enumerateOfSize(
  remaining: Pence,
  slots: number,
  startIdx: number,
  descending: readonly CoinValue[],
  smallest: CoinValue,
  current: CoinValue[],
  out: CoinValue[][],
  limit: number,
): void {
  if (out.length >= limit) return;
  if (slots === 0) {
    if (remaining === 0) out.push([...current]);
    return;
  }
  // Not enough left even if every remaining slot is the smallest coin.
  if (remaining < slots * smallest) return;

  for (let i = startIdx; i < descending.length; i++) {
    const coin = descending[i];
    if (coin === undefined) continue;
    // Coins are descending, so `coin` is the biggest still allowed. If even
    // `slots` of it undershoots, no smaller coin can help either.
    if (remaining > slots * coin) return;
    if (coin > remaining) continue;
    current.push(coin);
    enumerateOfSize(remaining - coin, slots - 1, i, descending, smallest, current, out, limit);
    current.pop();
    if (out.length >= limit) return;
  }
}
