import { describe, expect, it } from 'vitest';
import {
  BAKERY_ITEMS,
  CHARITY_ITEMS,
  ELECTRICITY_WEEKLY,
  GREENGROCER_ITEMS,
  POCKET_MONEY,
  SHIFT_BASE_WAGE,
  SHIFT_BONUS_PER_CUSTOMER,
  TOYSHOP_ITEMS,
} from '../../src/data/economy';
import { canMakeExactlyFrom, minimumCoins, totalOf } from '../../src/engine';

const ALL_AMOUNTS = [
  POCKET_MONEY,
  SHIFT_BASE_WAGE,
  SHIFT_BONUS_PER_CUSTOMER,
  ELECTRICITY_WEEKLY,
  ...BAKERY_ITEMS.map((i) => i.price),
];

describe('economy data', () => {
  it('every amount is a whole number of pence', () => {
    for (const amount of ALL_AMOUNTS) {
      expect(Number.isInteger(amount)).toBe(true);
      expect(amount).toBeGreaterThan(0);
    }
  });

  it('every bakery price is payable exactly with stage 1 coins', () => {
    // Prices are all <= 12p precisely so she can pay exactly with 1p/2p/5p/10p.
    for (const item of BAKERY_ITEMS) {
      expect(item.price).toBeLessThanOrEqual(12);
      const coins = minimumCoins(item.price, 1);
      expect(totalOf(coins)).toBe(item.price);
      // Holding exactly that handful of coins, she can pay to the penny.
      expect(canMakeExactlyFrom(item.price, coins)).toBe(true);
    }
  });

  it('never crosses the pound boundary at the stages the bakery uses', () => {
    // KS1 curriculum constraint: calculations stay within pence.
    for (const item of BAKERY_ITEMS) {
      expect(item.price).toBeLessThan(100);
    }
    expect(POCKET_MONEY).toBeLessThan(100);
  });

  it('has unique item ids', () => {
    const ids = BAKERY_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reserves the other shops for later, empty for now', () => {
    expect(GREENGROCER_ITEMS).toEqual([]);
    expect(TOYSHOP_ITEMS).toEqual([]);
    expect(CHARITY_ITEMS).toEqual([]);
  });

  it('pocket money is enough for at least two bakery items', () => {
    const cheapest = Math.min(...BAKERY_ITEMS.map((i) => i.price));
    expect(POCKET_MONEY).toBeGreaterThanOrEqual(cheapest * 2);
  });
});
