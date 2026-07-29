/* =============================================================================
 * MONEY IS INTEGER PENCE. Every value in this file is a whole number of pence.
 * Floats are forbidden. No decimal literals belong anywhere in this file.
 * ============================================================================= */

import type { Pence, ShopItem } from '../engine/types';

/** Weekly pocket money. */
export const POCKET_MONEY: Pence = 30;

/** Flat wage for working a shift. */
export const SHIFT_BASE_WAGE: Pence = 20;

/** Extra earned per customer served during a shift. */
export const SHIFT_BONUS_PER_CUSTOMER: Pence = 1;

/** The weekly electricity bill. */
export const ELECTRICITY_WEEKLY: Pence = 10;

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

/** Populated in a later prompt. */
export const GREENGROCER_ITEMS: readonly ShopItem[] = [];

/** Populated in a later prompt. */
export const TOYSHOP_ITEMS: readonly ShopItem[] = [];

/** Populated in a later prompt. */
export const CHARITY_ITEMS: readonly ShopItem[] = [];

/** Every item id the bakery can sell. */
export type BakeryItemId = (typeof BAKERY_ITEMS)[number]['id'];
