/* =============================================================================
 * THE BAKERY SHIFT — she stands behind the counter and customers buy from HER.
 *
 * The rest of the game teaches paying. This teaches the other side of the
 * counter, in the spirit of "Good Pizza, Great Pizza": a character walks in and
 * asks for something, she MAKES the order (an iced bun with exactly 3 cherries
 * on top), serves it, takes their coins, and counts the change out of the till.
 * Every happy customer drops a penny in the tip jar.
 *
 * Unlike that game there is no timer, no rating, no star and no upgrade shop:
 * a customer waits as long as she needs, and the only reward is pence.
 *
 * MONEY IS INTEGER PENCE. Every function in this file is PURE: no React, no
 * DOM, no Date.now(), no Math.random(). A week's customers are a function of
 * the week number and stage alone, so a reload shows the same queue.
 *
 * NO FAIL STATES. Giving the wrong change costs nothing: the customer says one
 * calm line, the coins stay where she put them, and she tries again. Nothing
 * is recorded against her.
 * ============================================================================= */

import type { CoinValue, Pence, Stage } from './types';
import { coinsForStage } from './coins';
import { minimumCoins, totalOf } from './money';
import { splitmix32 } from './week';
import {
  BAKERY_ITEMS,
  SHIFT_BASE_WAGE,
  SHIFT_BONUS_PER_CUSTOMER,
  SHIFT_CUSTOMERS,
} from '../data/economy';

/** Things that go on top of an iced bun. Counting them is the point. */
export type Topping = 'cherry' | 'button';
export const TOPPINGS: readonly Topping[] = ['cherry', 'button'];

export type ToppingCounts = Record<Topping, number>;
export const noToppings = (): ToppingCounts => ({ cherry: 0, button: 0 });

/**
 * The regulars. Each has a face (drawn by the screen, keyed by index) and a way
 * of saying hello. Lines are short and plain: a grown-up can read them aloud,
 * and the order itself is ALWAYS shown as pictures, so she never needs to read.
 */
export const CAST = [
  { name: 'Granny Jo', hello: 'Hello, dear!' },
  { name: 'Captain Nia', hello: 'Ahoy there!' },
  { name: 'Postman Pete', hello: 'Morning! Busy day.' },
  { name: 'Little Sam', hello: 'Hi! I got my pocket money!' },
  { name: 'Chef Remy', hello: 'Bonjour! Your bread smells good.' },
  { name: 'Mr Bloom', hello: 'Hello! Lovely weather.' },
] as const;

/** How many different-looking customers the screen can draw. */
export const CUSTOMER_LOOKS = CAST.length;

/** The most toppings anyone asks for at this stage. */
export function maxToppings(stage: Stage): number {
  return stage === 1 ? 5 : 10;
}

export interface Customer {
  /** Bakery item ids, in the order she asks for them. One or two. */
  readonly itemIds: readonly string[];
  /** What the order costs altogether. */
  readonly price: Pence;
  /** The coins the customer puts on the counter. Always >= price. */
  readonly handedOver: readonly CoinValue[];
  /** handedOver - price. Zero means no change is needed. */
  readonly changeDue: Pence;
  /** Which of the CAST this is. 0..CUSTOMER_LOOKS-1. */
  readonly look: number;
  /**
   * What they want on their iced bun, or null if they want no toppings (or no
   * iced bun). Only ever one kind per order, between 1 and maxToppings(stage).
   */
  readonly toppings: { readonly kind: Topping; readonly count: number } | null;
}

function priceOf(id: string): Pence {
  const item = BAKERY_ITEMS.find((i) => i.id === id);
  return item === undefined ? 0 : item.price;
}

/**
 * Ways a customer might pay for `price` with the coins at `stage`, each one
 * strictly more than the price so that change is due:
 *
 *   - the smallest single coin worth more than the price (a 10p for a 9p bun);
 *   - the next round 10p, in the fewest coins (10p + 5p for a 12p loaf).
 *
 * Duplicates are removed. Never empty: the round-10p option always exists.
 */
function overpayments(price: Pence, stage: Stage): CoinValue[][] {
  const options: CoinValue[][] = [];

  const single = coinsForStage(stage)
    .sort((a, b) => a - b)
    .find((c) => c > price);
  if (single !== undefined) options.push([single]);

  // Next multiple of 10p strictly above the price, built by counting up.
  let roundUp = price + 1;
  while (roundUp % 10 !== 0) roundUp += 1;
  const roundCoins = minimumCoins(roundUp, stage);
  const roundTotal = totalOf(roundCoins);
  if (roundCoins.length > 0 && !options.some((o) => totalOf(o) === roundTotal)) {
    options.push(roundCoins);
  }

  return options;
}

/**
 * This week's queue of customers for the bakery shift.
 *
 * - Stage 1: everyone asks for one thing.
 * - Stage 2+: about one customer in three asks for two things, so she has to
 *   add the prices before she can think about change.
 * - About one customer in five pays exactly, so "no change needed" is a real
 *   answer she has to spot, not something that never happens.
 *
 * Deterministic in (week, stage). Always returns exactly `count` customers.
 */
export function shiftCustomers(
  week: number,
  stage: Stage,
  count: number = SHIFT_CUSTOMERS,
): Customer[] {
  const safeWeek = Number.isFinite(week) ? Math.floor(week) : 0;
  // A different queue per stage, so moving up a stage mid-week is a fresh queue.
  const next = splitmix32((safeWeek << 3) ^ stage ^ 0x5eed);
  const ids = BAKERY_ITEMS.map((i) => i.id);

  const out: Customer[] = [];
  let lastFirstItem = '';
  let lastLook = -1;

  for (let n = 0; n < count; n++) {
    // Never the same first item twice in a row — it would look like a repeat.
    let first = ids[next() % ids.length] ?? 'roll';
    if (first === lastFirstItem) first = ids[(ids.indexOf(first) + 1) % ids.length] ?? first;
    lastFirstItem = first;

    const itemIds: string[] = [first];
    if (stage >= 2 && next() % 3 === 0) {
      // Two DIFFERENT things, so "one of each" is always the right tray.
      let second = ids[next() % ids.length] ?? 'roll';
      if (second === first) second = ids[(ids.indexOf(second) + 1) % ids.length] ?? second;
      itemIds.push(second);
    }

    // Most iced buns come with something on top — that is the making part.
    let toppings: Customer['toppings'] = null;
    if (itemIds.includes('iced_bun') && next() % 4 !== 0) {
      toppings = {
        kind: TOPPINGS[next() % TOPPINGS.length] ?? 'cherry',
        count: 1 + (next() % maxToppings(stage)),
      };
    }

    // A different face from the last customer.
    let look = next() % CUSTOMER_LOOKS;
    if (look === lastLook) look = (look + 1) % CUSTOMER_LOOKS;
    lastLook = look;

    let price = 0;
    for (const id of itemIds) price += priceOf(id);

    let handedOver: CoinValue[];
    if (next() % 5 === 0) {
      handedOver = minimumCoins(price, stage);
    } else {
      const options = overpayments(price, stage);
      handedOver = options[next() % options.length] ?? minimumCoins(price, stage);
    }

    out.push({
      itemIds,
      price,
      handedOver,
      changeDue: totalOf(handedOver) - price,
      look,
      toppings,
    });
  }

  return out;
}

/**
 * Did she make what they asked for? Checked when she rings the bell.
 *
 * - `missing`: something they asked for is not on the tray.
 * - `extra`: something on the tray they did not ask for.
 * - `toppings`: the right things, but the count on the bun is not right yet.
 *
 * The tray is a multiset of item ids; order does not matter. Toppings only
 * exist on an iced bun, so with no bun on the tray they are ignored.
 */
export type OrderCheck =
  | { kind: 'right' }
  | { kind: 'missing' }
  | { kind: 'extra' }
  | { kind: 'toppings'; topping: Topping };

export function checkOrder(
  tray: readonly string[],
  toppings: ToppingCounts,
  customer: Pick<Customer, 'itemIds' | 'toppings'>,
): OrderCheck {
  const want = [...customer.itemIds];
  const have = [...tray];
  for (const id of want) {
    const i = have.indexOf(id);
    if (i === -1) return { kind: 'missing' };
    have.splice(i, 1);
  }
  if (have.length > 0) return { kind: 'extra' };

  if (!tray.includes('iced_bun')) return { kind: 'right' };
  for (const kind of TOPPINGS) {
    const wanted = customer.toppings?.kind === kind ? customer.toppings.count : 0;
    if (toppings[kind] !== wanted) return { kind: 'toppings', topping: customer.toppings?.kind ?? kind };
  }
  return { kind: 'right' };
}

/** How the change she counted out compares with what was due. */
export type ChangeCheck =
  | { kind: 'right' }
  | { kind: 'short'; by: Pence }
  | { kind: 'over'; by: Pence };

export function checkChange(given: readonly CoinValue[], due: Pence): ChangeCheck {
  const total = totalOf([...given]);
  if (total === due) return { kind: 'right' };
  if (total < due) return { kind: 'short', by: due - total };
  return { kind: 'over', by: total - due };
}

/**
 * Pay for serving `customers` people: the flat wage plus a penny tip from each
 * happy customer (SHIFT_BONUS_PER_CUSTOMER — shown in the game as the tip jar).
 * Built by adding, never by multiplying — see CLAUDE.md, integer pence.
 */
export function shiftPay(customers: number = SHIFT_CUSTOMERS): Pence {
  let pay = SHIFT_BASE_WAGE;
  for (let i = 0; i < customers; i++) pay += SHIFT_BONUS_PER_CUSTOMER;
  return pay;
}

/**
 * What she takes home at the end of a full shift, as real coins: the wage in
 * her stage's coins, then the tip jar as it actually is — one penny from each
 * customer. Always sums to shiftPay().
 */
export function wageCoins(stage: Stage): CoinValue[] {
  const tips: CoinValue[] = [];
  for (let i = 0; i < SHIFT_CUSTOMERS; i++) tips.push(SHIFT_BONUS_PER_CUSTOMER as CoinValue);
  return [...minimumCoins(SHIFT_BASE_WAGE, stage), ...tips];
}

/** Has she already worked this week's shift? One shift a week, no more. */
export function hasWorkedThisWeek(shiftWeek: number | null, week: number): boolean {
  return shiftWeek === week;
}

/** How each bakery item is said out loud, with its "a" or "an". */
const SPOKEN: Record<string, string> = {
  roll: 'a bread roll',
  banana_loaf: 'a banana loaf',
  iced_bun: 'an iced bun',
  loaf: 'a loaf of bread',
  sausage_roll: 'a sausage roll',
};

const TOPPING_WORDS: Record<Topping, { one: string; many: string }> = {
  cherry: { one: 'cherry', many: 'cherries' },
  button: { one: 'chocolate button', many: 'chocolate buttons' },
};

/**
 * The customer's order as a sentence, for the speech bubble and the voice:
 * "Can I have an iced bun with 3 cherries on top and a bread roll, please?"
 */
export function orderSentence(customer: Pick<Customer, 'itemIds' | 'toppings'>): string {
  const parts = customer.itemIds.map((id) => {
    const said = SPOKEN[id] ?? id;
    if (id !== 'iced_bun') return said;
    if (customer.toppings === null) return 'a plain iced bun';
    const { kind, count } = customer.toppings;
    const word = count === 1 ? TOPPING_WORDS[kind].one : TOPPING_WORDS[kind].many;
    return `${said} with ${count} ${word} on top`;
  });
  return `Can I have ${parts.join(' and ')}, please?`;
}
