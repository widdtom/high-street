/* =============================================================================
 * MONEY IS INTEGER PENCE. Every value in this file is a whole number of pence.
 * Floats are forbidden. No decimal literals belong anywhere in this file.
 * ============================================================================= */

import type { Pence, ShopItem, Stage } from '../engine/types';

/** Weekly pocket money. */
export const POCKET_MONEY: Pence = 30;

/** Flat wage for working a shift. */
export const SHIFT_BASE_WAGE: Pence = 20;

/** Extra earned per customer served during a shift. */
export const SHIFT_BONUS_PER_CUSTOMER: Pence = 1;

/** The weekly electricity bill. A top-up buys 7 days of light. */
export const ELECTRICITY_WEEKLY: Pence = 10;

/** Days of electricity one top-up buys. */
export const ELECTRICITY_DAYS_PER_TOPUP = 7;

/** Segments in the food meter. One food purchase fills one segment. */
export const FOOD_METER_MAX = 3;

/**
 * TODO: DELETE IN PROMPT 3.
 *
 * Temporary income top-up. The bakery shift does not exist yet, so weekly
 * income is 30p against essentials of 23-40p — nothing left for toys, and
 * joyless to test. Paid alongside pocket money in the Saturday sequence.
 *
 * This must not survive into the finished game: earning has to be something
 * she chooses to do. See CLAUDE.md, "Temporary scaffolding".
 */
export const TEMP_SHIFT_STANDIN: Pence = 25;

/**
 * Bakery stock. Every price is <= 12p so it can be paid exactly with the
 * stage 1 coins (1p, 2p, 5p, 10p) — no stage 3+ coins are needed here.
 */
export const BAKERY_ITEMS = [
  { id: 'roll', name: 'Bread roll', price: 5, isFood: true },
  { id: 'banana_loaf', name: 'Banana loaf', price: 8, isFood: true },
  { id: 'iced_bun', name: 'Iced bun', price: 9, isFood: true },
  { id: 'loaf', name: 'Loaf of bread', price: 12, isFood: true },
  { id: 'sausage_roll', name: 'Sausage roll', price: 12, isFood: true },
] as const;

export const GREENGROCER_ITEMS = [
  { id: 'banana', name: 'Banana', price: 2, isFood: true },
  { id: 'apple', name: 'Apple', price: 3, isFood: true },
  { id: 'beans', name: 'Tin of beans', price: 6, isFood: true },
  { id: 'carrots', name: 'Bag of carrots', price: 7, isFood: true },
  { id: 'pasta', name: 'Bag of pasta', price: 8, isFood: true },
  { id: 'milk', name: 'Milk', price: 14, isFood: true },
  { id: 'potatoes', name: 'Bag of potatoes', price: 15, isFood: true },
  { id: 'eggs', name: 'Box of eggs', price: 20, isFood: true },
  { id: 'strawberries', name: 'Strawberries', price: 25, isFood: true },
] as const;

export const TOYSHOP_ITEMS = [
  { id: 'stickers', name: 'Sticker sheet', price: 10, isFood: false },
  { id: 'bouncy_ball', name: 'Bouncy ball', price: 10, isFood: false },
  { id: 'bubbles', name: 'Bubbles', price: 15, isFood: false },
  { id: 'toy_car', name: 'Toy car', price: 25, isFood: false },
  { id: 'pens', name: 'Colouring pens', price: 30, isFood: false },
  { id: 'skipping', name: 'Skipping rope', price: 40, isFood: false },
  { id: 'small_teddy', name: 'Small teddy', price: 50, isFood: false },
  { id: 'big_teddy', name: 'Big teddy', price: 100, isFood: false },
  { id: 'scooter', name: 'Scooter', price: 200, isFood: false },
] as const;

/**
 * The charity shop. `price` is what it costs here; `newPrice` is what the same
 * kind of thing costs new in the toy shop. Both are always shown together —
 * that comparison is the entire reason this shop exists.
 */
export const CHARITY_ITEMS = [
  { id: 'used_stickers', name: 'Sticker book', price: 4, newPrice: 10, isFood: false },
  { id: 'used_jigsaw', name: 'Jigsaw', price: 8, newPrice: 20, isFood: false },
  { id: 'used_car', name: 'Toy car', price: 10, newPrice: 25, isFood: false },
  { id: 'used_skipping', name: 'Skipping rope', price: 15, newPrice: 40, isFood: false },
  { id: 'used_teddy', name: 'Teddy', price: 30, newPrice: 100, isFood: false },
] as const;

/** How many charity items are on the shelf in any given week. */
export const CHARITY_STOCK_PER_WEEK = 3;

/** Items only purchasable once she has reached this stage. */
export const STAGE_GATED_ITEMS: Readonly<Record<string, Stage>> = {
  // The scooter costs 200p, which needs the £2 coin — stage 4. It stays in the
  // window at every stage, priced, so it can be a saving goal from day one.
  scooter: 4,
};

/** Every shop item in the game, whichever shop it belongs to. */
export const ALL_ITEMS: readonly ShopItem[] = [
  ...BAKERY_ITEMS,
  ...GREENGROCER_ITEMS,
  ...TOYSHOP_ITEMS,
  ...CHARITY_ITEMS,
];

export function itemById(id: string): ShopItem | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** Every item id the bakery can sell. */
export type BakeryItemId = (typeof BAKERY_ITEMS)[number]['id'];
