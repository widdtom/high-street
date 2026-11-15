import { describe, expect, it } from 'vitest';
import {
  ALL_ITEMS,
  BAKERY_ITEMS,
  CHARITY_ITEMS,
  ELECTRICITY_WEEKLY,
  FOOD_METER_MAX,
  GREENGROCER_ITEMS,
  POCKET_MONEY,
  SHIFT_BASE_WAGE,
  SHIFT_BONUS_PER_CUSTOMER,
  STAGE_GATED_ITEMS,
  SHIFT_CUSTOMERS,
  TOYSHOP_ITEMS,
  itemById,
} from '../../src/data/economy';
import { canMakeExactlyFrom, coinsForStage, minimumCoins, totalOf } from '../../src/engine';

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

  it('stocks all four shops', () => {
    expect(GREENGROCER_ITEMS).toHaveLength(9);
    expect(TOYSHOP_ITEMS).toHaveLength(9);
    expect(CHARITY_ITEMS).toHaveLength(5);
  });

  it('every item id in the game is unique', () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every price in the game is a positive whole number of pence', () => {
    for (const item of ALL_ITEMS) {
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThan(0);
    }
  });

  it('the charity shop always undercuts the toy shop', () => {
    // The whole point of the shop. If one of these ever flipped, the lesson
    // would silently invert.
    for (const item of CHARITY_ITEMS) {
      expect(Number.isInteger(item.newPrice)).toBe(true);
      expect(item.price).toBeLessThan(item.newPrice);
    }
  });

  it('only the scooter is stage-gated, and only to stage 4', () => {
    expect(STAGE_GATED_ITEMS).toEqual({ scooter: 4 });
    const scooter = TOYSHOP_ITEMS.find((i) => i.id === 'scooter');
    expect(scooter?.price).toBe(200);
    // 200p needs the £2 coin, which arrives at stage 4.
    expect(coinsForStage(3)).not.toContain(200);
    expect(coinsForStage(4)).toContain(200);
  });

  it('itemById finds everything and nothing else', () => {
    for (const item of ALL_ITEMS) {
      expect(itemById(item.id)?.price).toBe(item.price);
    }
    expect(itemById('no_such_thing')).toBeUndefined();
  });

  it('a full bakery shift pays 25p: 20p plus a penny for each of 5 customers', () => {
    expect(SHIFT_CUSTOMERS).toBe(5);
    let pay = SHIFT_BASE_WAGE;
    for (let i = 0; i < SHIFT_CUSTOMERS; i++) pay += SHIFT_BONUS_PER_CUSTOMER;
    expect(pay).toBe(25);
  });

  it('pocket money alone covers a week of the cheapest essentials', () => {
    // Earning is a choice. Skipping the shift must never leave her hungry or in
    // the dark if she buys carefully.
    const cheapestFood = Math.min(...ALL_ITEMS.filter((i) => i.isFood).map((i) => i.price));
    expect(cheapestFood * FOOD_METER_MAX + ELECTRICITY_WEEKLY).toBeLessThanOrEqual(POCKET_MONEY);
  });

  it('a week of essentials is affordable on a week of income', () => {
    const cheapestFood = Math.min(
      ...ALL_ITEMS.filter((i) => i.isFood).map((i) => i.price),
    );
    const essentials = cheapestFood * FOOD_METER_MAX + ELECTRICITY_WEEKLY;
    expect(essentials).toBeLessThanOrEqual(POCKET_MONEY + SHIFT_BASE_WAGE + SHIFT_CUSTOMERS);
  });

  it('pocket money is enough for at least two bakery items', () => {
    const cheapest = Math.min(...BAKERY_ITEMS.map((i) => i.price));
    expect(POCKET_MONEY).toBeGreaterThanOrEqual(cheapest * 2);
  });
});
