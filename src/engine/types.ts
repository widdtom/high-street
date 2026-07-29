/* =============================================================================
 * MONEY IS INTEGER PENCE.
 * Every monetary value in this codebase is a whole number of pence held in a
 * TypeScript `number`. Floats are forbidden for money. Never use *, / or
 * decimals to derive a monetary amount. Formatting to "£1.20" happens ONLY at
 * the display layer, via formatMoney().
 * ============================================================================= */

/** A whole number of pence. Never fractional. */
export type Pence = number;

/** The eight circulating UK coin denominations, in pence. */
export type CoinValue = 1 | 2 | 5 | 10 | 20 | 50 | 100 | 200;

/** Difficulty stage. Controls which coins exist and how money is displayed. */
export type Stage = 1 | 2 | 3 | 4;

/** Physical shape of a coin, which the SVG renderer draws literally. */
export type CoinShape = 'circle' | 'heptagon' | 'dodecagon';

/** Metal appearance of a coin. */
export type CoinColour = 'copper' | 'silver' | 'bimetallic-gold-outer' | 'bimetallic-silver-inner';

/** Physical and visual facts about a single denomination. */
export interface CoinSpec {
  readonly value: CoinValue;
  readonly label: string;
  readonly diameterMm: number;
  readonly shape: CoinShape;
  readonly colour: CoinColour;
}

/** Which monarch's portrait appears on the obverse. */
export type Monarch = 'elizabeth' | 'charles';

/** The outcome of an attempt to pay for something. */
export type PaymentResult =
  | { kind: 'exact' }
  | { kind: 'short'; shortBy: Pence }
  | { kind: 'over'; changeDue: Pence; changeCoins: CoinValue[] };

/** A purchasable item in any shop on the high street. */
export interface ShopItem {
  readonly id: string;
  readonly name: string;
  readonly price: Pence;
  readonly isFood: boolean;
}
