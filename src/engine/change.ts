/* =============================================================================
 * GIVING CHANGE — THE KS1 "COUNTING ON" METHOD
 * Money is INTEGER PENCE throughout. The coins come back in the order a
 * shopkeeper would count them into the child's hand, not sorted.
 * ============================================================================= */

import type { CoinValue, PaymentResult, Pence, Stage } from './types';
import { assertCoinValue, assertStage, coinsForStage } from './coins';
import { assertPence, totalOf } from './money';

/**
 * Change for `paid` against `price`, counted on from the price.
 *
 * This is how change is taught (and given) in a UK shop: start at the price and
 * count upwards to the amount handed over, hopping to a round 10p first where a
 * coin allows it, then striding with the biggest coins that fit.
 *
 * At each step:
 *   1. If the running total is not a multiple of 10p and some stage coin lands
 *      it exactly on the next multiple of 10p without passing `paid`, use it.
 *   2. Otherwise use the largest stage coin that does not overshoot `paid`.
 *
 * Example: price 35p, paid with a 50p at stage 3 => [5, 10]
 *          (35 -> 40 with a 5p, then 40 -> 50 with a 10p).
 *
 * The result is in COUNTING ORDER, which is typically small-then-large and is
 * deliberately NOT sorted descending. It always sums to exactly `paid - price`.
 * Returns [] when `paid <= price`. Terminates because 1p exists at every stage.
 */
export function changeByCountingOn(price: Pence, paid: Pence, stage: Stage): CoinValue[] {
  assertPence(price, 'price');
  assertPence(paid, 'paid');
  assertStage(stage);
  if (paid <= price) return [];

  const ascending = coinsForStage(stage).sort((a, b) => a - b);
  const out: CoinValue[] = [];
  let total = price;

  while (total < paid) {
    const gapToTen = total % 10 === 0 ? 0 : 10 - (total % 10);
    let chosen: CoinValue | undefined;

    // Step 1: bridge to the next round 10p if a single coin does it exactly.
    if (gapToTen > 0 && total + gapToTen <= paid) {
      chosen = ascending.find((c) => c === gapToTen);
    }

    // Step 2: otherwise stride with the largest coin that still fits.
    if (chosen === undefined) {
      for (let i = ascending.length - 1; i >= 0; i--) {
        const c = ascending[i];
        if (c !== undefined && total + c <= paid) {
          chosen = c;
          break;
        }
      }
    }

    /* istanbul ignore next -- unreachable while 1p is in every stage. */
    if (chosen === undefined) {
      throw new Error(
        `cannot count on from ${String(total)} to ${String(paid)} with stage ${String(stage)} coins`,
      );
    }

    out.push(chosen);
    total += chosen;
  }

  return out;
}

/**
 * Evaluate a handful of coins offered against a price.
 *
 * - sums to less than the price => `{ kind: 'short', shortBy }`
 * - sums to exactly the price   => `{ kind: 'exact' }`
 * - sums to more                => `{ kind: 'over', changeDue, changeCoins }`,
 *   where `changeCoins` is the counting-on change for the amount handed over.
 *
 * `price` may not be negative. Every offered element must be a real coin.
 */
export function checkPayment(price: Pence, offered: CoinValue[], stage: Stage): PaymentResult {
  assertPence(price, 'price');
  assertStage(stage);
  if (price < 0) {
    throw new TypeError(`price must not be negative; received ${String(price)}`);
  }
  if (!Array.isArray(offered)) {
    throw new TypeError('offered must be an array of coin values');
  }
  for (const c of offered) {
    assertCoinValue(c);
  }

  const total = totalOf(offered);
  if (total < price) return { kind: 'short', shortBy: price - total };
  if (total === price) return { kind: 'exact' };
  return {
    kind: 'over',
    changeDue: total - price,
    changeCoins: changeByCountingOn(price, total, stage),
  };
}
