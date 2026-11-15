/* =============================================================================
 * THE BOSS'S JOBS
 * ============================================================================= */

import { describe, expect, it } from 'vitest';
import type { Stage } from '../../src/engine/types';
import {
  DOUGHNUTS,
  FRUITS,
  OVEN_ITEMS,
  SHELF_CAPACITY,
  SHIFT_PLAN,
  TASKS_PER_SHIFT,
  TASK_KINDS,
  checkDecorate,
  checkFill,
  checkOven,
  shiftTasks,
  taskRequest,
  taskThanks,
  type Task,
} from '../../src/engine/tasks';
import { SHIFT_CUSTOMERS } from '../../src/data/economy';
import { orderSentence } from '../../src/engine/shift';

const STAGES: Stage[] = [1, 2, 3, 4];
const WEEKS = Array.from({ length: 200 }, (_, i) => i + 1);

function allTasks(stage: Stage): Task[] {
  return WEEKS.flatMap((w) => shiftTasks(w, stage));
}

describe('shiftTasks', () => {
  it('gives TASKS_PER_SHIFT different jobs, deterministically', () => {
    for (const stage of STAGES) {
      for (const week of WEEKS) {
        const t = shiftTasks(week, stage);
        expect(t).toHaveLength(TASKS_PER_SHIFT);
        expect(new Set(t.map((x) => x.kind)).size).toBe(TASKS_PER_SHIFT);
        expect(shiftTasks(week, stage)).toEqual(t);
      }
    }
  });

  it('every kind of job turns up', () => {
    const kinds = new Set(allTasks(1).map((t) => t.kind));
    for (const k of TASK_KINDS) expect(kinds.has(k)).toBe(true);
  });

  it('roll counts stay small at stage 1', () => {
    for (const stage of STAGES) {
      for (const t of allTasks(stage)) {
        if (t.kind !== 'roll') continue;
        expect(t.rolls).toBeGreaterThanOrEqual(3);
        expect(t.rolls).toBeLessThanOrEqual(stage === 1 ? 6 : 10);
      }
    }
  });

  it('fill jobs fit on the tray', () => {
    for (const stage of STAGES) {
      for (const t of allTasks(stage)) {
        if (t.kind !== 'fill') continue;
        expect(t.jam).toBeGreaterThanOrEqual(1);
        expect(t.cream).toBeGreaterThanOrEqual(1);
        expect(t.jam + t.cream).toBeLessThanOrEqual(stage === 1 ? DOUGHNUTS - 1 : DOUGHNUTS);
      }
    }
  });

  it('decorate patterns really repeat, and show a whole unit plus one', () => {
    for (const stage of STAGES) {
      for (const t of allTasks(stage)) {
        if (t.kind !== 'decorate') continue;
        const unit = t.given - 1;
        expect(stage === 1 ? unit === 2 : unit === 2 || unit === 3).toBe(true);
        for (let i = unit; i < t.pattern.length; i++) expect(t.pattern[i]).toBe(t.pattern[i - unit]);
        for (const f of t.pattern) expect(FRUITS).toContain(f);
        // At least one slot left to do, and more than one fruit in play.
        expect(t.given).toBeLessThan(t.pattern.length);
        expect(new Set(t.pattern).size).toBeGreaterThan(1);
      }
    }
  });

  it('oven jobs use two different things that fit on their shelves', () => {
    for (const stage of STAGES) {
      for (const t of allTasks(stage)) {
        if (t.kind !== 'oven') continue;
        expect(OVEN_ITEMS).toContain(t.top.item);
        expect(OVEN_ITEMS).toContain(t.bottom.item);
        expect(t.top.item).not.toBe(t.bottom.item);
        for (const s of [t.top, t.bottom]) {
          expect(s.count).toBeGreaterThanOrEqual(1);
          expect(s.count).toBeLessThanOrEqual(stage === 1 ? 3 : SHELF_CAPACITY);
        }
      }
    }
  });

  it('sweep piles are on the floor, apart, with one right answer among three', () => {
    for (const stage of STAGES) {
      for (const t of allTasks(stage)) {
        if (t.kind !== 'sweep') continue;
        const n = t.piles.length;
        expect(n).toBeGreaterThanOrEqual(3);
        expect(n).toBeLessThanOrEqual(stage === 1 ? 6 : 9);
        for (const [x, y] of t.piles) {
          expect(x).toBeGreaterThanOrEqual(5);
          expect(x).toBeLessThanOrEqual(95);
          expect(y).toBeGreaterThanOrEqual(5);
          expect(y).toBeLessThanOrEqual(95);
        }
        expect(new Set(t.piles.map(([x, y]) => `${x},${y}`)).size).toBe(n);
        expect(t.choices).toHaveLength(3);
        expect(t.choices.filter((c) => c === n)).toHaveLength(1);
        expect([...t.choices].sort((a, b) => a - b)).toEqual(t.choices);
        for (const c of t.choices) expect(c).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('SHIFT_PLAN', () => {
  it('has every customer once and every job once, starting with the boss', () => {
    const customers = SHIFT_PLAN.filter((s) => s.kind === 'customer').map((s) => s.index);
    const tasks = SHIFT_PLAN.filter((s) => s.kind === 'task').map((s) => s.index);
    expect(customers).toEqual(Array.from({ length: SHIFT_CUSTOMERS }, (_, i) => i));
    expect(tasks).toEqual(Array.from({ length: TASKS_PER_SHIFT }, (_, i) => i));
    expect(SHIFT_PLAN[0]?.kind).toBe('task');
  });
});

describe('checking jobs', () => {
  const fill = { kind: 'fill' as const, jam: 2, cream: 1 };
  it('fill: counts each filling', () => {
    expect(checkFill(['jam', 'cream', 'jam', null, null, null], fill)).toEqual({ kind: 'right' });
    expect(checkFill(['jam', 'cream', null, null, null, null], fill)).toEqual({ kind: 'notYet', jam: 1, cream: 1 });
    expect(checkFill(['jam', 'jam', 'cream', 'cream', null, null], fill).kind).toBe('notYet');
  });

  const deco = { kind: 'decorate' as const, pattern: ['kiwi', 'strawberry', 'kiwi', 'strawberry'] as const, given: 3 };
  it('decorate: points at the first slot that is not right yet', () => {
    expect(checkDecorate(['kiwi', 'strawberry', 'kiwi', 'strawberry'], deco)).toEqual({ kind: 'right' });
    expect(checkDecorate(['kiwi', 'strawberry', 'kiwi', null], deco)).toEqual({ kind: 'notYet', firstWrong: 3 });
    expect(checkDecorate(['kiwi', 'strawberry', 'kiwi', 'kiwi'], deco)).toEqual({ kind: 'notYet', firstWrong: 3 });
  });

  const oven = {
    kind: 'oven' as const,
    top: { item: 'loaf' as const, count: 2 },
    bottom: { item: 'roll' as const, count: 1 },
  };
  it('oven: the right things, the right number, on the right shelf', () => {
    expect(checkOven(['loaf', 'loaf'], ['roll'], oven)).toEqual({ kind: 'right' });
    expect(checkOven(['roll'], ['loaf', 'loaf'], oven)).toEqual({ kind: 'notYet', shelf: 'top' });
    expect(checkOven(['loaf', 'loaf'], [], oven)).toEqual({ kind: 'notYet', shelf: 'bottom' });
    expect(checkOven(['loaf', 'loaf', 'loaf'], ['roll'], oven).kind).toBe('notYet');
  });
});

describe('what people say', () => {
  it('the boss asks for every job in words, with numerals', () => {
    for (const t of allTasks(2)) {
      expect(taskRequest(t).length).toBeGreaterThan(10);
      expect(taskThanks(t).length).toBeGreaterThan(3);
      expect(taskRequest(t, true).startsWith('Hello!')).toBe(true);
    }
    expect(taskRequest({ kind: 'roll', rolls: 4 })).toBe('Please roll out the dough 4 times.');
    expect(
      taskRequest({ kind: 'oven', top: { item: 'loaf', count: 1 }, bottom: { item: 'roll', count: 3 } }),
    ).toContain('1 loaf on the top shelf and 3 bread rolls on the bottom shelf');
  });

  it('customers say their order', () => {
    expect(orderSentence({ itemIds: ['roll'], toppings: null })).toBe('Can I have a bread roll, please?');
    expect(orderSentence({ itemIds: ['iced_bun', 'loaf'], toppings: { kind: 'cherry', count: 3 } })).toBe(
      'Can I have an iced bun with 3 cherries on top and a loaf of bread, please?',
    );
    expect(orderSentence({ itemIds: ['iced_bun'], toppings: { kind: 'button', count: 1 } })).toBe(
      'Can I have an iced bun with 1 chocolate button on top, please?',
    );
    expect(orderSentence({ itemIds: ['iced_bun'], toppings: null })).toBe('Can I have a plain iced bun, please?');
  });
});
