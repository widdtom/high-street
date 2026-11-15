/* =============================================================================
 * THE BOSS'S JOBS — the other half of a bakery shift.
 *
 * Mrs Crumb, who runs the bakery, gives her three jobs a shift in between the
 * customers. Each one is a small hands-on thing a real baker does, with a bit
 * of Year 1/2 maths folded in:
 *
 *   roll      roll the dough N times             counting
 *   fill      jam in A doughnuts, cream in B     counting two groups
 *   decorate  finish the fruit pattern on a cake patterns / logic
 *   oven      N of these on the TOP shelf, M on  position words + counting
 *             the BOTTOM shelf, then bake
 *   sweep     tap every crumb pile away, then    counting, hand-eye
 *             say how many there were
 *
 * PURE. No React, no DOM, no Date.now(), no Math.random(): a week's jobs are a
 * function of (week, stage) alone, like its customers.
 *
 * NO FAIL STATES. A job that is not right yet gets one calm line from the boss
 * and she tries again. Nothing is lost and nothing is recorded.
 *
 * TAP, NEVER DRAG. Rolling and sweeping are taps, not gestures.
 * ============================================================================= */

import type { Stage } from './types';
import { splitmix32 } from './week';

export type TaskKind = 'roll' | 'fill' | 'decorate' | 'oven' | 'sweep';
export const TASK_KINDS: readonly TaskKind[] = ['roll', 'fill', 'decorate', 'oven', 'sweep'];

export type Fruit = 'strawberry' | 'blueberry' | 'kiwi';
export const FRUITS: readonly Fruit[] = ['strawberry', 'blueberry', 'kiwi'];

export type Filling = 'jam' | 'cream';
export const FILLINGS: readonly Filling[] = ['jam', 'cream'];

/** What goes in the oven. Item ids from the bakery. */
export type OvenItem = 'loaf' | 'roll' | 'sausage_roll' | 'banana_loaf';
export const OVEN_ITEMS: readonly OvenItem[] = ['loaf', 'roll', 'sausage_roll', 'banana_loaf'];

/** Doughnuts on the fill tray. */
export const DOUGHNUTS = 6;
/** Most things that fit on one oven shelf. */
export const SHELF_CAPACITY = 4;

export type Task =
  | { readonly kind: 'roll'; readonly rolls: number }
  | { readonly kind: 'fill'; readonly jam: number; readonly cream: number }
  | {
      readonly kind: 'decorate';
      /** The whole pattern, slot by slot. */
      readonly pattern: readonly Fruit[];
      /** How many slots are already done, from the left, to show the pattern. */
      readonly given: number;
    }
  | {
      readonly kind: 'oven';
      readonly top: { readonly item: OvenItem; readonly count: number };
      readonly bottom: { readonly item: OvenItem; readonly count: number };
    }
  | {
      readonly kind: 'sweep';
      /** Where each crumb pile is, as percentages of the floor (x, y). */
      readonly piles: ReadonlyArray<readonly [number, number]>;
      /** Three numbers to choose from when asked how many; one is right. */
      readonly choices: readonly number[];
    };

/* ---------------------------------------------------------------------------
 * Making jobs
 * ------------------------------------------------------------------------- */

type Rng = () => number;

/** An integer in [lo, hi], inclusive. */
function between(next: Rng, lo: number, hi: number): number {
  return lo + (next() % (hi - lo + 1));
}

function pick<T>(next: Rng, list: readonly T[]): T {
  const item = list[next() % list.length];
  if (item === undefined) throw new Error('pick from an empty list');
  return item;
}

function makeRoll(next: Rng, stage: Stage): Task {
  return { kind: 'roll', rolls: stage === 1 ? between(next, 3, 6) : between(next, 4, 10) };
}

function makeFill(next: Rng, stage: Stage): Task {
  const most = stage === 1 ? 3 : 4;
  const jam = between(next, 1, most);
  // Never more than the tray holds; stage 1 leaves at least one plain one.
  const room = DOUGHNUTS - jam - (stage === 1 ? 1 : 0);
  const cream = between(next, 1, Math.min(most, room));
  return { kind: 'fill', jam, cream };
}

/**
 * Pattern units, as letters. Stage 1 only ever sees AB. Later stages add
 * three-long units, which need more looking to spot.
 */
const UNITS: Record<Stage, readonly string[]> = {
  1: ['AB'],
  2: ['AB', 'ABC', 'AAB'],
  3: ['ABC', 'AAB', 'ABB'],
  4: ['ABC', 'AAB', 'ABB'],
};

function makeDecorate(next: Rng, stage: Stage): Task {
  const unit = pick(next, UNITS[stage]);
  // Give each letter its own fruit.
  const fruits = [...FRUITS];
  const letters: Record<string, Fruit> = {};
  for (const letter of ['A', 'B', 'C']) {
    const i = next() % fruits.length;
    letters[letter] = fruits[i] ?? 'strawberry';
    fruits.splice(i, 1);
  }
  const length = unit.length === 2 ? 6 : 8;
  const pattern: Fruit[] = [];
  for (let i = 0; i < length; i++) pattern.push(letters[unit[i % unit.length] ?? 'A'] ?? 'strawberry');
  // One whole unit plus one more, so the repeat is visible before she starts.
  return { kind: 'decorate', pattern, given: unit.length + 1 };
}

function makeOven(next: Rng, stage: Stage): Task {
  const most = stage === 1 ? 3 : SHELF_CAPACITY;
  const topItem = pick(next, OVEN_ITEMS);
  let bottomItem = pick(next, OVEN_ITEMS);
  if (bottomItem === topItem) {
    bottomItem = OVEN_ITEMS[(OVEN_ITEMS.indexOf(topItem) + 1) % OVEN_ITEMS.length] ?? 'roll';
  }
  return {
    kind: 'oven',
    top: { item: topItem, count: between(next, 1, most) },
    bottom: { item: bottomItem, count: between(next, 1, most) },
  };
}

function makeSweep(next: Rng, stage: Stage): Task {
  const count = stage === 1 ? between(next, 3, 6) : between(next, 5, 9);

  // A 4 x 3 grid of floor patches, shuffled, one pile per patch, nudged a
  // little off-centre so it looks like crumbs and not a grid.
  const cells: Array<[number, number]> = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) cells.push([col, row]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const a = cells[i];
    const b = cells[j];
    if (a !== undefined && b !== undefined) {
      cells[i] = b;
      cells[j] = a;
    }
  }
  const piles: Array<[number, number]> = cells.slice(0, count).map(([col, row]) => [
    12 + col * 22 + between(next, 0, 8),
    16 + row * 28 + between(next, 0, 10),
  ]);

  // The right answer and two near misses, smallest first.
  const choices = new Set<number>([count]);
  const offsets = [-2, -1, 1, 2];
  while (choices.size < 3) {
    const n = count + pick(next, offsets);
    if (n >= 1) choices.add(n);
  }
  return { kind: 'sweep', piles, choices: [...choices].sort((a, b) => a - b) };
}

const MAKERS: Record<TaskKind, (next: Rng, stage: Stage) => Task> = {
  roll: makeRoll,
  fill: makeFill,
  decorate: makeDecorate,
  oven: makeOven,
  sweep: makeSweep,
};

/** How many jobs the boss gives in one shift. */
export const TASKS_PER_SHIFT = 3;

/**
 * This week's jobs: TASKS_PER_SHIFT DIFFERENT kinds, so a shift never asks
 * for the same job twice, and over a few weeks she meets all five.
 */
export function shiftTasks(week: number, stage: Stage): Task[] {
  const safeWeek = Number.isFinite(week) ? Math.floor(week) : 0;
  const next = splitmix32((safeWeek << 3) ^ stage ^ 0x7a5c);
  const kinds = [...TASK_KINDS];
  for (let i = 0; i < TASKS_PER_SHIFT; i++) {
    const j = i + (next() % (kinds.length - i));
    const a = kinds[i];
    const b = kinds[j];
    if (a !== undefined && b !== undefined) {
      kinds[i] = b;
      kinds[j] = a;
    }
  }
  return kinds.slice(0, TASKS_PER_SHIFT).map((kind) => MAKERS[kind](next, stage));
}

/* ---------------------------------------------------------------------------
 * The shape of a shift
 * ------------------------------------------------------------------------- */

export type ShiftStep =
  | { readonly kind: 'task'; readonly index: number }
  | { readonly kind: 'customer'; readonly index: number };

/**
 * A job, two customers, a job, two customers, a job, one last customer. Starts
 * with the boss so she is welcomed in before the first customer arrives.
 */
export const SHIFT_PLAN: readonly ShiftStep[] = [
  { kind: 'task', index: 0 },
  { kind: 'customer', index: 0 },
  { kind: 'customer', index: 1 },
  { kind: 'task', index: 1 },
  { kind: 'customer', index: 2 },
  { kind: 'customer', index: 3 },
  { kind: 'task', index: 2 },
  { kind: 'customer', index: 4 },
];

/* ---------------------------------------------------------------------------
 * Checking a job
 * ------------------------------------------------------------------------- */

export type FillCheck = { kind: 'right' } | { kind: 'notYet'; jam: number; cream: number };

/** `doughnuts` is what is in each doughnut: a filling, or null for plain. */
export function checkFill(
  doughnuts: ReadonlyArray<Filling | null>,
  task: Extract<Task, { kind: 'fill' }>,
): FillCheck {
  let jam = 0;
  let cream = 0;
  for (const d of doughnuts) {
    if (d === 'jam') jam += 1;
    if (d === 'cream') cream += 1;
  }
  return jam === task.jam && cream === task.cream ? { kind: 'right' } : { kind: 'notYet', jam, cream };
}

export type DecorateCheck = { kind: 'right' } | { kind: 'notYet'; firstWrong: number };

/** `slots` is the cake as she has it now; null means an empty slot. */
export function checkDecorate(
  slots: ReadonlyArray<Fruit | null>,
  task: Extract<Task, { kind: 'decorate' }>,
): DecorateCheck {
  for (let i = 0; i < task.pattern.length; i++) {
    if (slots[i] !== task.pattern[i]) return { kind: 'notYet', firstWrong: i };
  }
  return { kind: 'right' };
}

export type OvenCheck = { kind: 'right' } | { kind: 'notYet'; shelf: 'top' | 'bottom' };

export function checkOven(
  top: readonly OvenItem[],
  bottom: readonly OvenItem[],
  task: Extract<Task, { kind: 'oven' }>,
): OvenCheck {
  const exactly = (shelf: readonly OvenItem[], want: { item: OvenItem; count: number }) =>
    shelf.length === want.count && shelf.every((i) => i === want.item);
  if (!exactly(top, task.top)) return { kind: 'notYet', shelf: 'top' };
  if (!exactly(bottom, task.bottom)) return { kind: 'notYet', shelf: 'bottom' };
  return { kind: 'right' };
}

/* ---------------------------------------------------------------------------
 * What the boss says. Spoken aloud and shown in her speech bubble. Numbers
 * are written as numerals on screen (see CLAUDE.md); the voice reads them.
 * ------------------------------------------------------------------------- */

const OVEN_NAMES: Record<OvenItem, { one: string; many: string }> = {
  loaf: { one: 'loaf', many: 'loaves' },
  roll: { one: 'bread roll', many: 'bread rolls' },
  sausage_roll: { one: 'sausage roll', many: 'sausage rolls' },
  banana_loaf: { one: 'banana loaf', many: 'banana loaves' },
};

export function ovenName(item: OvenItem, count: number): string {
  const n = OVEN_NAMES[item];
  return count === 1 ? n.one : n.many;
}

export const BOSS = { name: 'Mrs Crumb', hello: 'Hello! Thank you for coming in to help.' } as const;

/** The boss's request for a job. `first` adds her hello at the start of a shift. */
export function taskRequest(task: Task, first = false): string {
  const hello = first ? `${BOSS.hello} ` : '';
  switch (task.kind) {
    case 'roll':
      return `${hello}Please roll out the dough ${task.rolls} times.`;
    case 'fill':
      return `${hello}Please fill ${task.jam} doughnuts with jam and ${task.cream} with cream.`;
    case 'decorate':
      return `${hello}Can you finish the fruit pattern on this cake?`;
    case 'oven':
      return (
        `${hello}Put ${task.top.count} ${ovenName(task.top.item, task.top.count)} on the top shelf ` +
        `and ${task.bottom.count} ${ovenName(task.bottom.item, task.bottom.count)} on the bottom shelf. Then bake them!`
      );
    case 'sweep':
      return `${hello}Oh dear, crumbs everywhere! Please sweep up every pile.`;
  }
}

/** What she says when the job is done. */
export function taskThanks(task: Task): string {
  switch (task.kind) {
    case 'roll':
      return 'Lovely and flat. Thank you!';
    case 'fill':
      return 'Yum! Those look delicious.';
    case 'decorate':
      return 'What a beautiful cake!';
    case 'oven':
      return 'Ding! Golden brown. Perfect!';
    case 'sweep':
      return 'Spotless! Thank you.';
  }
}
