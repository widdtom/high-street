/* =============================================================================
 * THE BAKERY SHIFT — customers, change checking, wages
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { Stage } from '../../src/engine/types';
import { coinsForStage, totalOf } from '../../src/engine';
import {
  BAKERY_ITEMS,
  SHIFT_BASE_WAGE,
  SHIFT_BONUS_PER_CUSTOMER,
  SHIFT_CUSTOMERS,
} from '../../src/data/economy';
import {
  CAST,
  CUSTOMER_LOOKS,
  TOPPINGS,
  checkChange,
  checkOrder,
  maxToppings,
  noToppings,
  hasWorkedThisWeek,
  shiftCustomers,
  shiftPay,
  wageCoins,
} from '../../src/engine/shift';

const STAGES: Stage[] = [1, 2, 3, 4];
const bakeryIds = BAKERY_ITEMS.map((i) => i.id) as string[];

describe('shiftCustomers', () => {
  it('returns exactly SHIFT_CUSTOMERS customers by default', () => {
    expect(shiftCustomers(1, 1)).toHaveLength(SHIFT_CUSTOMERS);
  });

  it('is deterministic in week and stage', () => {
    for (const stage of STAGES) {
      expect(shiftCustomers(7, stage)).toEqual(shiftCustomers(7, stage));
    }
  });

  it('gives different weeks different queues', () => {
    const queues = new Set<string>();
    for (let week = 1; week <= 12; week++) queues.add(JSON.stringify(shiftCustomers(week, 1)));
    expect(queues.size).toBeGreaterThan(8);
  });

  it('is internally consistent for many weeks at every stage', () => {
    for (const stage of STAGES) {
      const allowed = new Set(coinsForStage(stage));
      for (let week = 1; week <= 200; week++) {
        for (const c of shiftCustomers(week, stage)) {
          // Only real bakery items, one or two of them.
          expect(c.itemIds.length).toBeGreaterThanOrEqual(1);
          expect(c.itemIds.length).toBeLessThanOrEqual(stage === 1 ? 1 : 2);
          for (const id of c.itemIds) expect(bakeryIds).toContain(id);

          // Price is the sum of the items.
          let sum = 0;
          for (const id of c.itemIds) sum += BAKERY_ITEMS.find((i) => i.id === id)?.price ?? 0;
          expect(c.price).toBe(sum);

          // Coins exist at this stage, cover the price, and change adds up.
          expect(c.handedOver.length).toBeGreaterThan(0);
          for (const coin of c.handedOver) expect(allowed.has(coin)).toBe(true);
          expect(totalOf([...c.handedOver])).toBe(c.price + c.changeDue);
          expect(c.changeDue).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(c.changeDue)).toBe(true);

          expect(c.look).toBeGreaterThanOrEqual(0);
          expect(c.look).toBeLessThan(CUSTOMER_LOOKS);
        }
      }
    }
  });

  it('keeps stage 1 change small enough to count on from the price', () => {
    for (let week = 1; week <= 200; week++) {
      for (const c of shiftCustomers(week, 1)) expect(c.changeDue).toBeLessThanOrEqual(10);
    }
  });

  it('sometimes needs no change, and usually does', () => {
    let exact = 0;
    let total = 0;
    for (let week = 1; week <= 200; week++) {
      for (const c of shiftCustomers(week, 1)) {
        total += 1;
        if (c.changeDue === 0) exact += 1;
      }
    }
    expect(exact).toBeGreaterThan(0);
    expect(exact).toBeLessThan(total - exact);
  });

  it('asks for two things only from stage 2', () => {
    let pairs = 0;
    for (let week = 1; week <= 100; week++) {
      for (const c of shiftCustomers(week, 2)) if (c.itemIds.length === 2) pairs += 1;
    }
    expect(pairs).toBeGreaterThan(0);
  });

  it('never repeats the same first item back to back', () => {
    for (let week = 1; week <= 100; week++) {
      const q = shiftCustomers(week, 1);
      for (let i = 1; i < q.length; i++) {
        expect(q[i]?.itemIds[0]).not.toBe(q[i - 1]?.itemIds[0]);
      }
    }
  });
});

describe('checkChange', () => {
  it('is right when the coins match exactly', () => {
    expect(checkChange([2, 1], 3)).toEqual({ kind: 'right' });
  });

  it('accepts no coins when no change is due', () => {
    expect(checkChange([], 0)).toEqual({ kind: 'right' });
  });

  it('reports short and over by how much', () => {
    expect(checkChange([1], 3)).toEqual({ kind: 'short', by: 2 });
    expect(checkChange([5], 3)).toEqual({ kind: 'over', by: 2 });
    expect(checkChange([1], 0)).toEqual({ kind: 'over', by: 1 });
  });
});

describe('wages', () => {
  it('pays the flat wage plus a penny per customer', () => {
    let expected = SHIFT_BASE_WAGE;
    for (let i = 0; i < SHIFT_CUSTOMERS; i++) expected += SHIFT_BONUS_PER_CUSTOMER;
    expect(shiftPay()).toBe(expected);
    expect(shiftPay()).toBe(25);
    expect(shiftPay(0)).toBe(SHIFT_BASE_WAGE);
  });

  it('pays in real coins that add up to the wage at every stage', () => {
    for (const stage of STAGES) {
      const coins = wageCoins(stage);
      expect(totalOf(coins)).toBe(shiftPay());
      const allowed = new Set(coinsForStage(stage));
      for (const c of coins) expect(allowed.has(c)).toBe(true);
    }
  });

  it('allows one shift a week', () => {
    expect(hasWorkedThisWeek(null, 1)).toBe(false);
    expect(hasWorkedThisWeek(1, 1)).toBe(true);
    expect(hasWorkedThisWeek(1, 2)).toBe(false);
  });
});

describe('orders and toppings', () => {
  it('only asks for toppings on an iced bun, one kind, within the stage limit', () => {
    let withToppings = 0;
    for (const stage of STAGES) {
      for (let week = 1; week <= 200; week++) {
        for (const c of shiftCustomers(week, stage)) {
          if (c.toppings === null) continue;
          withToppings += 1;
          expect(c.itemIds).toContain('iced_bun');
          expect(TOPPINGS).toContain(c.toppings.kind);
          expect(c.toppings.count).toBeGreaterThanOrEqual(1);
          expect(c.toppings.count).toBeLessThanOrEqual(maxToppings(stage));
        }
      }
    }
    expect(withToppings).toBeGreaterThan(0);
  });

  it('two-item orders are two different things', () => {
    for (let week = 1; week <= 200; week++) {
      for (const c of shiftCustomers(week, 3)) {
        if (c.itemIds.length === 2) expect(c.itemIds[0]).not.toBe(c.itemIds[1]);
      }
    }
  });

  it('never sends the same face twice in a row, and every face is in the cast', () => {
    for (let week = 1; week <= 100; week++) {
      const q = shiftCustomers(week, 2);
      for (let i = 0; i < q.length; i++) {
        expect(CAST[q[i]?.look ?? -1]).toBeDefined();
        if (i > 0) expect(q[i]?.look).not.toBe(q[i - 1]?.look);
      }
    }
  });

  const bun = { itemIds: ['iced_bun'], toppings: { kind: 'cherry' as const, count: 3 } };

  it('is right with the right things and the right count', () => {
    expect(checkOrder(['iced_bun'], { cherry: 3, button: 0 }, bun)).toEqual({ kind: 'right' });
    expect(checkOrder(['roll', 'loaf'], noToppings(), { itemIds: ['loaf', 'roll'], toppings: null })).toEqual({
      kind: 'right',
    });
  });

  it('spots missing, extra and miscounted', () => {
    expect(checkOrder([], noToppings(), bun).kind).toBe('missing');
    expect(checkOrder(['iced_bun', 'roll'], { cherry: 3, button: 0 }, bun).kind).toBe('extra');
    expect(checkOrder(['iced_bun'], { cherry: 2, button: 0 }, bun)).toEqual({ kind: 'toppings', topping: 'cherry' });
    expect(checkOrder(['iced_bun'], { cherry: 3, button: 1 }, bun).kind).toBe('toppings');
    // A plain bun stays plain.
    expect(checkOrder(['iced_bun'], { cherry: 1, button: 0 }, { itemIds: ['iced_bun'], toppings: null }).kind).toBe(
      'toppings',
    );
  });

  it('pays the wage plus a 1p tip jar', () => {
    const coins = wageCoins(1);
    expect(coins.filter((c) => c === 1).length).toBeGreaterThanOrEqual(SHIFT_CUSTOMERS);
  });
});
