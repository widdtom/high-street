/* =============================================================================
 * THE BOSS'S JOBS — five small hands-on screens.
 *
 * Every job is TAPS ONLY (no drag, no swipe), has NO TIMER and cannot be
 * failed: if it isn't right yet, Mrs Crumb says one calm line and she carries
 * on. The pure rules for each job, and the checks, live in engine/tasks.ts —
 * these components only hold the half-finished work while she does it.
 *
 * The short CSS transitions here (the pin rolling, the oven door, crumbs
 * sliding into the dustpan) are animation, never a countdown.
 * ============================================================================= */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import CustomerArt, { BOSS_LOOK, type CustomerMood } from '../CustomerArt';
import ItemArt from '../ItemArt';
import { BOSS_VOICE, speak } from '../speech';
import Speech from './Speech';
import {
  Broom,
  CrumbPile,
  Dough,
  Doughnut,
  Dustpan,
  FruitIcon,
  FruitShape,
  PipingBag,
  RollingPin,
} from './BakeryArt';
import {
  BOSS,
  DOUGHNUTS,
  FILLINGS,
  FRUITS,
  OVEN_ITEMS,
  SHELF_CAPACITY,
  checkDecorate,
  checkFill,
  checkOven,
  ovenName,
  taskRequest,
  taskThanks,
  type Filling,
  type Fruit,
  type OvenItem,
  type Task,
} from '../../engine/tasks';

type JobOf<K extends Task['kind']> = Extract<Task, { kind: K }>;

interface JobProps<K extends Task['kind']> {
  task: JobOf<K>;
  /** Mrs Crumb says something (and looks thoughtful). */
  say: (text: string) => void;
  /** The job is right. */
  complete: () => void;
  /** True once it is right: everything stops responding. */
  finished: boolean;
}

const DONE_BUTTON =
  'tappable flex w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-4 border-emerald-800/30 bg-emerald-500 text-3xl font-black text-white shadow-lg active:scale-95 disabled:opacity-40';

/** A number and that many little pictures: "3 [x][x][x]". For the bubble. */
function CountOf({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-xl bg-amber-50 px-2 py-1">
      <span className="flex flex-wrap items-center">
        {Array.from({ length: n }, (_, i) => (
          <span key={i}>{children}</span>
        ))}
      </span>
      <span className="ml-1 text-2xl font-black tabular-nums text-amber-900">{n}</span>
    </span>
  );
}

/** The job as pictures in the boss's bubble, so it works without reading. */
function JobPicture({ task }: { task: Task }) {
  switch (task.kind) {
    case 'roll':
      return (
        <span className="flex items-center gap-2" data-testid="job-picture">
          <RollingPin size={90} />
          <span className="text-3xl font-black tabular-nums text-amber-900">× {task.rolls}</span>
        </span>
      );
    case 'fill':
      return (
        <span className="flex flex-wrap items-center gap-2" data-testid="job-picture">
          <CountOf n={task.jam}>
            <Doughnut filling="jam" size={34} />
          </CountOf>
          <CountOf n={task.cream}>
            <Doughnut filling="cream" size={34} />
          </CountOf>
        </span>
      );
    case 'oven':
      return (
        <span className="flex flex-wrap items-center gap-4" data-testid="job-picture">
          {(['top', 'bottom'] as const).map((shelf) => (
            <span key={shelf} className="flex items-center gap-2">
              <span className="text-lg font-black text-amber-900/80">{shelf === 'top' ? 'Top' : 'Bottom'}</span>
              <CountOf n={task[shelf].count}>
                <ItemArt id={task[shelf].item} size={34} />
              </CountOf>
            </span>
          ))}
        </span>
      );
    case 'decorate':
    case 'sweep':
      return null;
  }
}

/* ---------------------------------------------------------------------------
 * Roll the dough
 * ------------------------------------------------------------------------- */

function RollJob({ task, complete, finished }: JobProps<'roll'>) {
  const [rolls, setRolls] = useState(0);
  const done = useRef(false);

  const roll = () => {
    if (finished || rolls >= task.rolls) return;
    const n = rolls + 1;
    setRolls(n);
    speak(String(n), BOSS_VOICE);
    if (n === task.rolls && !done.current) {
      done.current = true;
      // Let the number be heard before she says well done.
      setTimeout(complete, 900);
    }
  };

  return (
    <div className="flex h-full items-center justify-center gap-10" data-testid="job" data-job="roll" data-rolls={task.rolls}>
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={roll}
          aria-label="Roll the dough"
          data-testid="rolling-pin"
          className="tappable rounded-2xl p-2 active:scale-95"
        >
          <span
            className="block transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(${rolls % 2 === 0 ? -60 : 60}px) rotate(${rolls * 180}deg)` }}
          >
            <RollingPin size={240} />
          </span>
        </button>
        <Dough flat={rolls / task.rolls} width={440} />
      </div>
      <div className="flex flex-col items-center gap-3">
        <span className="text-8xl font-black tabular-nums text-amber-900" data-testid="roll-count">
          {rolls}
        </span>
        <span className="flex max-w-[12rem] flex-wrap justify-center gap-2">
          {Array.from({ length: task.rolls }, (_, i) => (
            <span
              key={i}
              className={[
                'h-6 w-6 rounded-full border-4 transition',
                i < rolls ? 'border-amber-700 bg-amber-500' : 'border-amber-900/25 bg-white',
              ].join(' ')}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Fill the doughnuts
 * ------------------------------------------------------------------------- */

function FillJob({ task, say, complete, finished }: JobProps<'fill'>) {
  const [doughnuts, setDoughnuts] = useState<(Filling | null)[]>(() => Array.from({ length: DOUGHNUTS }, () => null));
  const [bag, setBag] = useState<Filling>('jam');

  const tap = (i: number) => {
    if (finished) return;
    setDoughnuts((ds) => ds.map((d, j) => (j !== i ? d : d === bag ? null : bag)));
  };

  const check = () => {
    const r = checkFill(doughnuts, task);
    if (r.kind === 'right') complete();
    else say(`Not quite. I asked for ${task.jam} with jam and ${task.cream} with cream. Let's count them again.`);
  };

  const count = (f: Filling) => doughnuts.filter((d) => d === f).length;

  return (
    <div className="flex h-full items-stretch gap-4 p-2" data-testid="job" data-job="fill" data-jam={task.jam} data-cream={task.cream}>
      <div className="flex w-36 shrink-0 flex-col justify-center gap-3">
        {FILLINGS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={bag === f}
            aria-label={f === 'jam' ? 'Jam' : 'Cream'}
            data-testid="filling"
            data-filling={f}
            onClick={() => setBag(f)}
            className={[
              'tappable flex items-center justify-center gap-1 rounded-2xl border-4 py-2 shadow transition active:scale-95',
              bag === f ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 -translate-y-0.5' : 'border-amber-900/15 bg-white/70',
            ].join(' ')}
          >
            <PipingBag filling={f} size={64} />
            <span className="text-3xl font-black tabular-nums text-amber-900">{count(f)}</span>
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-3 place-items-center gap-2 rounded-3xl bg-stone-200/70 p-3 shadow-inner">
        {doughnuts.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-label={d === null ? 'Doughnut' : `Doughnut with ${d}`}
            data-testid="doughnut"
            data-filled={d ?? ''}
            onClick={() => tap(i)}
            className="tappable rounded-full active:scale-95"
          >
            <Doughnut filling={d} size={120} />
          </button>
        ))}
      </div>

      <button type="button" onClick={check} disabled={finished} className={DONE_BUTTON} data-testid="job-done">
        Done
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Decorate the cake — finish the pattern
 * ------------------------------------------------------------------------- */

function DecorateJob({ task, say, complete, finished }: JobProps<'decorate'>) {
  const [slots, setSlots] = useState<(Fruit | null)[]>(() =>
    task.pattern.map((f, i) => (i < task.given ? f : null)),
  );
  const [fruit, setFruit] = useState<Fruit>(FRUITS[0] ?? 'strawberry');
  const [hint, setHint] = useState<number | null>(null);

  const tap = (i: number) => {
    if (finished || i < task.given) return;
    setHint(null);
    setSlots((ss) => ss.map((s, j) => (j !== i ? s : s === fruit ? null : fruit)));
  };

  const check = () => {
    const r = checkDecorate(slots, task);
    if (r.kind === 'right') {
      setHint(null);
      complete();
    } else {
      setHint(r.firstWrong);
      say(
        slots[r.firstWrong] === null
          ? 'Nearly! There is still a space to fill. What comes next?'
          : 'Look at the pattern again. What should go in the space with the ring?',
      );
    }
  };

  const n = task.pattern.length;
  const slotSize = n === 6 ? 92 : 76;

  return (
    <div className="flex h-full items-stretch gap-4 p-2" data-testid="job" data-job="decorate" data-pattern={task.pattern.join(',')} data-given={task.given}>
      <div className="flex w-32 shrink-0 flex-col justify-center gap-3">
        {FRUITS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={fruit === f}
            aria-label={f}
            data-testid="fruit"
            data-fruit={f}
            onClick={() => setFruit(f)}
            className={[
              'tappable flex items-center justify-center rounded-2xl border-4 py-2 shadow transition active:scale-95',
              fruit === f ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 -translate-y-0.5' : 'border-amber-900/15 bg-white/70',
            ].join(' ')}
          >
            <FruitIcon fruit={f} size={64} />
          </button>
        ))}
      </div>

      {/* The cake: fruit spaces along the top, then the sponge and icing. */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex items-end gap-1.5 px-6">
          {slots.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={s === null ? 'Empty space' : s}
              data-testid="cake-slot"
              data-fruit={s ?? ''}
              data-given={i < task.given}
              onClick={() => tap(i)}
              className={[
                'tappable flex items-center justify-center rounded-full transition',
                i < task.given ? 'cursor-default' : 'active:scale-90',
                s === null ? 'border-4 border-dashed border-rose-300 bg-white/60' : '',
                hint === i ? 'ring-8 ring-sky-400' : '',
              ].join(' ')}
              style={{ width: slotSize, height: slotSize }}
            >
              {s !== null && (
                <svg viewBox="0 0 40 40" width={slotSize} height={slotSize} role="presentation">
                  <FruitShape fruit={s} x={20} y={21} r={15} />
                </svg>
              )}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 600 170" className="-mt-3 w-[92%]" role="presentation">
          <rect x="20" y="20" width="560" height="140" rx="18" fill="#f2c59a" />
          <rect x="20" y="78" width="560" height="14" fill="#c8102e" opacity="0.8" />
          <rect x="20" y="92" width="560" height="10" fill="#fff6e6" />
          <path
            d="M20 20 H580 V48 Q560 66 540 48 Q520 70 500 48 Q480 64 460 48 Q440 72 420 48 Q400 62 380 48 Q360 70 340 48 Q320 64 300 48 Q280 72 260 48 Q240 62 220 48 Q200 70 180 48 Q160 64 140 48 Q120 72 100 48 Q80 62 60 48 Q40 70 20 48 Z"
            fill="#fff3f7"
          />
          <rect x="0" y="152" width="600" height="14" rx="7" fill="#d6d3d1" />
        </svg>
      </div>

      <button type="button" onClick={check} disabled={finished} className={DONE_BUTTON} data-testid="job-done">
        Done
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Load the oven — top shelf and bottom shelf
 * ------------------------------------------------------------------------- */

function OvenJob({ task, say, complete, finished }: JobProps<'oven'>) {
  const [item, setItem] = useState<OvenItem>(OVEN_ITEMS[0] ?? 'loaf');
  const [shelves, setShelves] = useState<{ top: OvenItem[]; bottom: OvenItem[] }>({ top: [], bottom: [] });
  const [baking, setBaking] = useState<'no' | 'closing' | 'baked'>('no');

  useEffect(() => {
    if (baking !== 'closing') return undefined;
    const t = setTimeout(() => setBaking('baked'), 1600);
    return () => clearTimeout(t);
  }, [baking]);
  useEffect(() => {
    if (baking === 'baked') complete();
    // complete is stable for the life of this job
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baking]);

  const locked = finished || baking !== 'no';
  const add = (shelf: 'top' | 'bottom') => {
    if (locked) return;
    setShelves((s) => (s[shelf].length >= SHELF_CAPACITY ? s : { ...s, [shelf]: [...s[shelf], item] }));
  };
  const remove = (shelf: 'top' | 'bottom', i: number) => {
    if (locked) return;
    setShelves((s) => ({ ...s, [shelf]: s[shelf].filter((_, j) => j !== i) }));
  };
  const bake = () => {
    if (locked) return;
    const r = checkOven(shelves.top, shelves.bottom, task);
    if (r.kind === 'right') setBaking('closing');
    else {
      const want = task[r.shelf];
      say(`Look at the ${r.shelf} shelf again. I need ${want.count} ${ovenName(want.item, want.count)} there.`);
    }
  };

  return (
    <div className="flex h-full items-stretch gap-4 p-2" data-testid="job" data-job="oven" data-oven={JSON.stringify({ top: task.top, bottom: task.bottom })}>
      <div className="grid w-44 shrink-0 grid-cols-2 content-center gap-2">
        {OVEN_ITEMS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={item === id}
            aria-label={ovenName(id, 1)}
            data-testid="oven-item"
            data-item={id}
            onClick={() => setItem(id)}
            className={[
              'tappable flex h-20 items-center justify-center rounded-2xl border-4 bg-white shadow transition active:scale-95',
              item === id ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 -translate-y-0.5' : 'border-amber-900/15',
            ].join(' ')}
          >
            <ItemArt id={id} size={58} />
          </button>
        ))}
      </div>

      {/* The oven */}
      <div className="relative flex flex-1 flex-col gap-2 overflow-hidden rounded-3xl border-[12px] border-stone-600 bg-stone-800 p-3">
        {(['top', 'bottom'] as const).map((shelf) => (
          <div key={shelf} className="flex flex-1 items-center gap-2 border-b-[6px] border-stone-400 px-2" data-testid="shelf" data-shelf={shelf} data-count={shelves[shelf].length}>
            <span className="w-24 text-xl font-black text-stone-200">{shelf === 'top' ? 'Top' : 'Bottom'}</span>
            {shelves[shelf].map((id, i) => (
              <button
                key={`${id}-${i}`}
                type="button"
                aria-label="Take it out"
                onClick={() => remove(shelf, i)}
                className="tappable rounded-xl active:scale-95"
              >
                <span
                  className="block transition duration-1000"
                  style={{ filter: baking === 'baked' ? 'saturate(1.6) brightness(0.85)' : 'saturate(0.35) brightness(1.25)' }}
                >
                  <ItemArt id={id} size={74} />
                </span>
              </button>
            ))}
            {shelves[shelf].length < SHELF_CAPACITY && (
              <button
                type="button"
                aria-label={`Put it on the ${shelf} shelf`}
                data-testid="shelf-add"
                data-shelf={shelf}
                onClick={() => add(shelf)}
                className="tappable ml-auto flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-dashed border-stone-400 text-5xl font-black text-stone-300 active:scale-95"
              >
                +
              </button>
            )}
          </div>
        ))}

        {/* The door closes while it bakes, with a warm glow through the glass. */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-600 transition-transform duration-700 ease-in-out"
          style={{ transform: baking === 'closing' ? 'translateY(0)' : 'translateY(-102%)' }}
        >
          <div className="h-2/3 w-3/4 rounded-2xl bg-gradient-to-b from-orange-300 to-orange-600 opacity-80 shadow-inner" />
        </div>
      </div>

      <button type="button" onClick={bake} disabled={locked} className={DONE_BUTTON} data-testid="job-done">
        <svg viewBox="0 0 32 32" className="h-12 w-12" role="presentation">
          <path d="M16 3 Q24 12 22 19 Q26 16 25 12 Q30 20 24 27 Q20 31 16 31 Q8 31 6 23 Q5 16 11 11 Q11 17 14 18 Q10 10 16 3 Z" fill="#ffd166" />
        </svg>
        Bake
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Sweep the floor, then count the piles
 * ------------------------------------------------------------------------- */

function SweepJob({ task, say, complete, finished }: JobProps<'sweep'>) {
  const [swept, setSwept] = useState<boolean[]>(() => task.piles.map(() => false));
  const sweptCount = swept.filter(Boolean).length;
  const allSwept = sweptCount === task.piles.length;
  const asked = useRef(false);

  useEffect(() => {
    if (allSwept && !asked.current) {
      asked.current = true;
      say('All swept! How many piles of crumbs did you sweep up?');
    }
  }, [allSwept, say]);

  const sweep = (i: number) => {
    if (finished) return;
    setSwept((s) => s.map((v, j) => (j === i ? true : v)));
  };

  const answer = (n: number) => {
    if (finished) return;
    if (n === task.piles.length) complete();
    else say('Hmm, not quite. Count the crumbs in the dustpan.');
  };

  return (
    <div
      className="relative h-full overflow-hidden rounded-3xl border-4 border-amber-900/15"
      style={{
        backgroundColor: '#f3ece0',
        backgroundImage:
          'linear-gradient(45deg, #ebe2d2 25%, transparent 25%, transparent 75%, #ebe2d2 75%), linear-gradient(45deg, #ebe2d2 25%, transparent 25%, transparent 75%, #ebe2d2 75%)',
        backgroundSize: '80px 80px',
        backgroundPosition: '0 0, 40px 40px',
      }}
      data-testid="job"
      data-job="sweep"
      data-piles={task.piles.length}
    >
      {task.piles.map(([x, y], i) => (
        <button
          key={i}
          type="button"
          aria-label="Sweep up the crumbs"
          data-testid="crumbs"
          data-swept={swept[i] === true}
          onClick={() => sweep(i)}
          disabled={swept[i] === true}
          className="tappable absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 transition-all duration-700 ease-in active:scale-90"
          style={
            swept[i] === true
              ? { left: '90%', top: '86%', opacity: 0, transform: 'translate(-50%, -50%) scale(0.3)' }
              : { left: `${x}%`, top: `${y}%` }
          }
        >
          <CrumbPile size={118} />
        </button>
      ))}

      {/* The dustpan fills up, one little pile for each one swept: easy to count. */}
      <div className="pointer-events-none absolute bottom-2 right-3 flex items-end gap-2">
        <Broom size={96} />
        <div className="relative">
          <Dustpan size={170} />
          <div className="absolute left-5 top-6 flex w-[8rem] flex-wrap gap-0" data-testid="dustpan" data-count={sweptCount}>
            {Array.from({ length: sweptCount }, (_, i) => (
              <CrumbPile key={i} size={34} />
            ))}
          </div>
        </div>
      </div>

      {allSwept && (
        <div className="absolute inset-0 flex items-center justify-center gap-6 bg-white/30">
          {task.choices.map((n) => (
            <button
              key={n}
              type="button"
              disabled={finished}
              data-testid="count-choice"
              data-value={n}
              onClick={() => answer(n)}
              className="tappable h-32 w-32 rounded-3xl border-4 border-amber-800/40 bg-white text-7xl font-black tabular-nums text-amber-900 shadow-xl active:scale-95"
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * A job, with the boss
 * ------------------------------------------------------------------------- */

export function TaskStep({
  task,
  first,
  onNext,
}: {
  task: Task;
  /** The first job of the shift: she says hello first. */
  first: boolean;
  onNext: () => void;
}) {
  const [line, setLine] = useState(() => taskRequest(task, first));
  const [mood, setMood] = useState<CustomerMood>('waiting');
  const [finished, setFinished] = useState(false);
  const lineRef = useRef(line);
  lineRef.current = line;

  // Stable, so jobs can use it in effects.
  const sayRef = useRef((text: string) => {
    setMood('thinking');
    // The same words again would not re-trigger the speech effect: say them now.
    if (text === lineRef.current) speak(text, BOSS_VOICE);
    else setLine(text);
  });
  const say = sayRef.current;

  const complete = () => {
    setFinished(true);
    setMood('happy');
    setLine(taskThanks(task));
  };

  const props = { say, complete, finished };

  return (
    <div className="flex h-full flex-col" data-testid="task-step" data-kind={task.kind} data-finished={finished}>
      {/* The boss and what she says */}
      <div className="flex min-h-[15.5rem] shrink-0 items-end gap-5 bg-gradient-to-b from-[#fbe9d0] to-[#f6dcb8] px-6 pt-2">
        <div className="shrink-0" data-testid="boss">
          <CustomerArt look={BOSS_LOOK} mood={mood} size={190} />
        </div>
        <div className="mb-4">
          <Speech name={BOSS.name} text={line} voice={BOSS_VOICE}>
            {!finished && <JobPicture task={task} />}
          </Speech>
        </div>
      </div>
      <div className="h-3 shrink-0 bg-[#9c6329] shadow" />

      {/* The job */}
      <div className="relative min-h-0 flex-1 bg-[#c98b4b]/30 p-2">
        {task.kind === 'roll' && <RollJob task={task} {...props} />}
        {task.kind === 'fill' && <FillJob task={task} {...props} />}
        {task.kind === 'decorate' && <DecorateJob task={task} {...props} />}
        {task.kind === 'oven' && <OvenJob task={task} {...props} />}
        {task.kind === 'sweep' && <SweepJob task={task} {...props} />}

        {finished && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <button
              type="button"
              onClick={onNext}
              data-testid="task-next"
              className="tappable h-24 rounded-3xl border-4 border-emerald-800/30 bg-emerald-500 px-14 text-3xl font-black text-white shadow-2xl active:scale-95"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
