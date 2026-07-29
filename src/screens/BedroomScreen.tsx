/* =============================================================================
 * HER ROOM
 *
 * The shelf is the only reward this game gives. Everything she chooses to buy
 * and keep sits here, in a row, getting longer. Nothing else accumulates: no
 * stars, no points, no XP.
 *
 * THE DARK IS NOT A PUNISHMENT. When the electricity runs out the room is drawn
 * dim — brightness and a cool tint, never black — and she is told, once, calmly,
 * that the lights will not come on. Every control still works, every number is
 * still readable, and topping up costs 10p and one tap. See CLAUDE.md,
 * "No fail states".
 *
 * TAP TO PAY, NEVER DRAG. There is not a single drag handler in this file.
 * ============================================================================= */

import { useMemo } from 'react';
import CoinTray, { type HeldCoin } from '../components/CoinTray';
import ItemArt from '../components/ItemArt';
import MoneyBox from '../components/MoneyBox';
import CoinSVG from '../components/coins/CoinSVG';
import { ELECTRICITY_WEEKLY, itemById } from '../data/economy';
import { formatMoney } from '../engine';
import type { CoinValue } from '../engine/types';
import { lightsAreOn } from '../engine/week';
import { ELECTRICITY_ITEM_ID, paymentTotal } from '../state/gameReducer';
import { useGame } from '../state/GameContext';

/** How many things fit along one shelf before the next one starts. */
const PER_SHELF = 6;
/** Shelves drawn even when they are empty, so there is visibly room to grow. */
const MIN_SHELVES = 3;

/* ---------------------------------------------------------------------------
 * Little pieces of scenery
 * ------------------------------------------------------------------------- */

function BackArrow() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" role="presentation">
      <path
        d="M20 6 L10 16 L20 26"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Her face. Calm and neutral — never sad, never cross. */
function Face({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="presentation">
      <circle cx="32" cy="34" r="21" fill="#f4c9a4" />
      <path d="M11 32 Q12 8 32 8 Q52 8 53 32 Q46 22 32 22 Q18 22 11 32 Z" fill="#7a4a24" />
      <circle cx="24" cy="34" r="3" fill="#3a2a18" />
      <circle cx="40" cy="34" r="3" fill="#3a2a18" />
      <path d="M25 45 L39 45" stroke="#3a2a18" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="40" r="4" fill="#f0a89a" opacity="0.6" />
      <circle cx="46" cy="40" r="4" fill="#f0a89a" opacity="0.6" />
    </svg>
  );
}

/** A bulb. Lit is warm and yellow; unlit is simply grey — not scary. */
function Bulb({ on, size = 36 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 40 48" width={size} height={size} role="presentation">
      <circle cx="20" cy="18" r="14" fill={on ? '#ffd84d' : '#c9c6bd'} />
      {on && (
        <g stroke="#f2b528" strokeWidth="3" strokeLinecap="round">
          <path d="M20 1 L20 -3" />
          <path d="M4 8 L1 5" />
          <path d="M36 8 L39 5" />
        </g>
      )}
      <path d="M15 28 L25 28 L24 38 Q20 41 16 38 Z" fill={on ? '#c9a12c' : '#a9a69d'} />
      <path d="M14 32 L26 32 M14 36 L26 36" stroke="#8d8a82" strokeWidth="2" />
    </svg>
  );
}

/** The window. Daylight when the lights are on, moonlight when they are not. */
function Window({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 100 90" className="h-full w-full" role="presentation">
      <rect x="6" y="6" width="88" height="78" rx="4" fill={lit ? '#a8d8f0' : '#2f3f66'} />
      {lit ? (
        <>
          <circle cx="72" cy="26" r="10" fill="#ffe27a" />
          <ellipse cx="34" cy="34" rx="16" ry="9" fill="#ffffff" opacity="0.85" />
          <ellipse cx="52" cy="56" rx="18" ry="8" fill="#ffffff" opacity="0.7" />
        </>
      ) : (
        <>
          <path d="M70 16 a11 11 0 1 0 8 20 a13 13 0 0 1 -8 -20 Z" fill="#f6eec2" />
          <circle cx="28" cy="24" r="2" fill="#f6eec2" />
          <circle cx="44" cy="40" r="1.6" fill="#f6eec2" />
          <circle cx="20" cy="50" r="1.6" fill="#f6eec2" />
          <circle cx="56" cy="20" r="1.4" fill="#f6eec2" />
        </>
      )}
      <rect x="6" y="6" width="88" height="78" rx="4" fill="none" stroke="#c9a97a" strokeWidth="6" />
      <path d="M50 6 L50 84 M6 45 L94 45" stroke="#c9a97a" strokeWidth="5" />
    </svg>
  );
}

function Moon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="presentation">
      <path d="M22 4 a13 13 0 1 0 6 22 a15 15 0 0 1 -6 -22 Z" fill="#ffe9a8" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------- */

export default function BedroomScreen() {
  const { state, dispatch } = useGame();
  const { save, payment } = state;
  const { stage, bedroom, bag } = save;

  const lit = lightsAreOn(save.electricityDays);
  const toppingUp = payment.selectedItemId === ELECTRICITY_ITEM_ID;

  /** How many of each thing she owns, so two bouncy balls read as two. */
  const ownedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of bag) {
      counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + 1);
    }
    return counts;
  }, [bag]);

  /**
   * Everything on the shelf, in the order she put it there. `bedroom` is a
   * plain string[], so a duplicated id is possible in a hand-edited save; the
   * key carries the position as well as the id so React copes either way.
   */
  const shelves = useMemo(() => {
    const rows: string[][] = [];
    for (let i = 0; i < bedroom.length; i += PER_SHELF) {
      rows.push(bedroom.slice(i, i + PER_SHELF));
    }
    while (rows.length < MIN_SHELVES) rows.push([]);
    return rows;
  }, [bedroom]);

  /** Things she owns that are not food and are not on the shelf yet. */
  const inBag = useMemo(() => {
    const seen = new Set<string>();
    const out: { itemId: string; name: string; count: number }[] = [];
    for (const entry of bag) {
      if (seen.has(entry.itemId)) continue;
      if (bedroom.includes(entry.itemId)) continue;
      const item = itemById(entry.itemId);
      if (item === undefined || item.isFood) continue;
      seen.add(entry.itemId);
      out.push({
        itemId: entry.itemId,
        name: item.name,
        count: ownedCounts.get(entry.itemId) ?? 1,
      });
    }
    return out;
  }, [bag, bedroom, ownedCounts]);

  const dim = lit
    ? undefined
    : { filter: 'brightness(0.62) saturate(0.7) hue-rotate(-8deg)' as const };

  return (
    <div className="relative flex h-full flex-col bg-[#f6ecd8]">
      {/* Header. Never dimmed: it has to stay readable in the dark. */}
      <div className="flex shrink-0 items-center gap-3 border-b-4 border-amber-900/15 bg-[#8b6bb1] px-3 py-1.5 text-white">
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'street' })}
          aria-label="Back to the street"
          className="tappable rounded-full bg-white/25 p-1 active:scale-90"
        >
          <BackArrow />
        </button>
        <h1 className="text-2xl font-black tracking-wide">Your room</h1>
        {/* The week counter lives in the meter bar above, on every screen. */}
        <div className="ml-auto flex items-center gap-2 rounded-full bg-white/20 px-3 py-0.5">
          <Bulb on={lit} size={26} />
          <span className="text-lg font-bold">{lit ? 'Lights on' : 'Lights off'}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* -------------------------------------------------- the room */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border-4 border-amber-900/25 bg-[#e9d9bd] shadow-inner">
            {/* Wall and shelves. This is the only thing the dark touches. */}
            <div className="flex min-h-0 flex-1 flex-col" style={dim}>
              <div
                className="flex min-h-0 flex-1 flex-col"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #f0dfc2 0 26px, #e7d3b2 26px 52px)',
                }}
              >
                {/* Window, sitting above the shelves */}
                <div className="flex shrink-0 items-start justify-end px-4 pt-2">
                  <div className="h-24 w-28">
                    <Window lit={lit} />
                  </div>
                </div>

                {/* The shelves themselves */}
                <div className="flex min-h-0 flex-1 flex-col justify-end gap-1 px-4 pb-3">
                  {shelves.map((row, rowIndex) => (
                    <Shelf
                      key={`shelf-${rowIndex}`}
                      row={row}
                      rowIndex={rowIndex}
                      ownedCounts={ownedCounts}
                      onTake={(itemId) => dispatch({ type: 'removeFromBedroom', itemId })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Her, and the one line about the lights. Full brightness. */}
            <div className="flex shrink-0 items-center gap-3 border-t-4 border-amber-900/15 bg-white/85 px-3 py-2">
              <Face size={56} />
              {lit ? (
                <p className="text-xl font-semibold text-amber-900">
                  This is my room. Everything I keep goes on the shelf.
                </p>
              ) : (
                <>
                  <p className="text-xl font-semibold text-amber-900">
                    The lights won&rsquo;t turn on.
                  </p>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'selectItem', itemId: ELECTRICITY_ITEM_ID })}
                    className="tappable ml-auto flex items-center gap-2 rounded-2xl border-4 border-amber-700/40 bg-amber-300 px-4 py-2 text-xl font-black text-amber-950 shadow-md active:scale-95"
                  >
                    <Bulb on={false} size={30} />
                    <span>Turn the lights on</span>
                    <span className="rounded-full bg-white px-3 py-0.5 tabular-nums">
                      {formatMoney(ELECTRICITY_WEEKLY, stage)}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* What is still in her bag */}
          <div className="flex h-32 shrink-0 flex-col rounded-3xl border-4 border-amber-900/20 bg-white/70 px-3 py-1.5">
            <span className="shrink-0 text-base font-bold text-amber-900/70">
              In your bag — tap to put it on the shelf
            </span>
            {inBag.length === 0 ? (
              <p className="flex flex-1 items-center text-lg font-semibold text-amber-900/40">
                Nothing to put away.
              </p>
            ) : (
              <ul className="flex min-h-0 flex-1 items-center gap-2 overflow-x-auto">
                {inBag.map((entry) => (
                  <li key={entry.itemId}>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'placeInBedroom', itemId: entry.itemId })}
                      aria-label={`Put the ${entry.name} on the shelf`}
                      className="tappable relative flex w-24 flex-col items-center gap-0.5 rounded-2xl border-4 border-amber-800/25 bg-amber-50 px-1 py-1 active:scale-95"
                    >
                      <ItemArt id={entry.itemId} size={48} />
                      <span className="w-full text-center text-[0.7rem] font-bold leading-tight text-amber-900">
                        {entry.name}
                      </span>
                      {entry.count > 1 && <CountBadge count={entry.count} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* --------------------------------------- money box and bedtime */}
        <div className="flex w-[25rem] shrink-0 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <MoneyBox />
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'goToBed' })}
            className="tappable flex h-20 shrink-0 items-center justify-center gap-3 rounded-3xl border-4 border-indigo-900/40 bg-indigo-500 text-2xl font-black text-white shadow-lg active:scale-95"
          >
            <Moon size={30} />
            Go to bed
          </button>
        </div>
      </div>

      {toppingUp && <TopUpPanel />}
      <TopUpOutcome />
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 rounded-full border-2 border-amber-800/40 bg-white px-1.5 text-sm font-black tabular-nums text-amber-900">
      {count}
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * One shelf: a plank with a wooden front edge, things standing on it.
 * ------------------------------------------------------------------------- */

interface ShelfProps {
  row: readonly string[];
  rowIndex: number;
  ownedCounts: ReadonlyMap<string, number>;
  onTake: (itemId: string) => void;
}

function Shelf({ row, rowIndex, ownedCounts, onTake }: ShelfProps) {
  return (
    <div className="flex flex-col">
      <ul className="flex h-[4.75rem] items-end gap-3 px-3">
        {row.map((itemId, i) => {
          const item = itemById(itemId);
          const count = ownedCounts.get(itemId) ?? 1;
          return (
            <li key={`${itemId}-${rowIndex}-${i}`} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onTake(itemId)}
                aria-label={
                  item === undefined
                    ? 'Take this off the shelf'
                    : `Take the ${item.name} off the shelf`
                }
                className="tappable relative flex flex-col items-center rounded-xl px-1 active:scale-95"
              >
                <ItemArt id={itemId} size={64} />
                {count > 1 && <CountBadge count={count} />}
              </button>
              {/* The little shadow that makes it sit ON the shelf */}
              <div className="-mt-1 h-1.5 w-14 rounded-full bg-amber-950/25 blur-[1px]" />
            </li>
          );
        })}
      </ul>
      <div className="h-2 rounded-sm bg-[#c08b4f]" />
      <div className="h-2.5 rounded-b-md bg-[#96683a] shadow-md" />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * THE ELECTRICITY TOP-UP
 *
 * The same payment the shops use — pick coins, press Pay — kept small and
 * local to the bedroom. Paying too little changes nothing: no coins move, and
 * she is simply invited to add another one.
 * ------------------------------------------------------------------------- */

function TopUpPanel() {
  const { state, dispatch } = useGame();
  const { purse, stage } = state.save;
  const { paidIndices } = state.payment;

  const paidSet = useMemo(() => new Set(paidIndices), [paidIndices]);

  const trayCoins: HeldCoin[] = useMemo(
    () =>
      purse
        .map((value, index) => ({ value, index }))
        .filter((coin) => !paidSet.has(coin.index))
        .sort((a, b) => a.value - b.value),
    [purse, paidSet],
  );

  const paymentCoins: HeldCoin[] = useMemo(
    () =>
      paidIndices
        .map((index) => {
          const value = purse[index];
          return value === undefined ? null : { index, value };
        })
        .filter((coin): coin is HeldCoin => coin !== null),
    [paidIndices, purse],
  );

  const total = paymentTotal(state);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-indigo-950/40 p-4">
      <div className="flex w-[46rem] flex-col gap-2 rounded-3xl border-4 border-amber-800/40 bg-[#fdf6e8] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <Bulb on size={40} />
          <h2 className="text-2xl font-black text-amber-900">Lights for the week</h2>
          <span className="rounded-full border-2 border-amber-800/40 bg-amber-50 px-3 py-0.5 text-2xl font-black tabular-nums text-amber-900">
            {formatMoney(ELECTRICITY_WEEKLY, stage)}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'clearItem' })}
            className="tappable ml-auto rounded-2xl bg-amber-900/10 px-4 py-1.5 text-lg font-bold text-amber-900/70 active:scale-95"
          >
            Not now
          </button>
        </div>

        {/* Coins she has put down */}
        <div className="flex items-center gap-3 rounded-2xl border-4 border-amber-900/20 bg-amber-100/70 p-2">
          <span className="w-24 shrink-0 text-3xl font-black tabular-nums text-amber-900">
            {formatMoney(total, stage)}
          </span>
          <CoinTray
            coins={paymentCoins}
            onTapCoin={(index) => dispatch({ type: 'removeCoin', index })}
            scale={0.8}
            className="min-h-[4.5rem] flex-1 content-center"
            empty={
              <div className="flex min-h-[4.5rem] flex-1 items-center text-lg font-semibold text-amber-900/40">
                Tap the coins you want to pay with.
              </div>
            }
          />
          <button
            type="button"
            disabled={paymentCoins.length === 0}
            onClick={() =>
              dispatch({
                type: 'pay',
                itemId: ELECTRICITY_ITEM_ID,
                price: ELECTRICITY_WEEKLY,
                isFood: false,
                ts: Date.now(),
              })
            }
            className={[
              'tappable w-28 shrink-0 rounded-2xl border-4 py-3 text-2xl font-black shadow-md transition',
              paymentCoins.length > 0
                ? 'border-emerald-800/30 bg-emerald-500 text-white active:scale-95'
                : 'border-stone-300 bg-stone-200 text-stone-400',
            ].join(' ')}
          >
            Pay
          </button>
        </div>

        {/* Her purse */}
        <CoinTray
          coins={trayCoins}
          onTapCoin={(index) => dispatch({ type: 'addCoin', index })}
          scale={0.85}
          className="justify-center gap-2 rounded-2xl bg-amber-200/50 p-2"
          empty={
            <div className="rounded-2xl bg-amber-200/50 p-4 text-center text-lg font-semibold text-amber-900/50">
              No coins in your purse just now.
            </div>
          }
        />
      </div>
    </div>
  );
}

/** What happened when she pressed Pay. Never a telling-off. */
function TopUpOutcome() {
  const { state, dispatch } = useGame();
  const outcome = state.payment.outcome;
  if (outcome === null) return null;
  // Only ever speak for the top-up; a shop's outcome belongs to the shop.
  if (outcome.kind !== 'short' && outcome.itemId !== ELECTRICITY_ITEM_ID) return null;

  const dismiss = () => dispatch({ type: 'dismissOutcome' });

  if (outcome.kind === 'short') {
    return (
      <button
        type="button"
        onClick={dismiss}
        className="tappable absolute inset-0 z-30 flex items-center justify-center bg-indigo-950/40"
      >
        <div className="flex items-center gap-4 rounded-3xl border-4 border-sky-200 bg-white px-8 py-6 shadow-2xl">
          <Face size={64} />
          <div className="text-left">
            <p className="text-2xl font-bold text-sky-900">That&rsquo;s not quite enough yet.</p>
            <p className="text-lg text-sky-700">Try adding another coin.</p>
          </div>
        </div>
      </button>
    );
  }

  const changeCoins: CoinValue[] = outcome.kind === 'over' ? outcome.changeCoins : [];

  return (
    <button
      type="button"
      onClick={dismiss}
      className="tappable absolute inset-0 z-30 flex items-center justify-center bg-amber-900/30"
    >
      <div className="flex flex-col items-center gap-2 rounded-3xl border-4 border-amber-200 bg-white px-8 py-5 shadow-2xl">
        <Bulb on size={56} />
        <p className="text-2xl font-bold text-amber-900">The lights are on.</p>
        {changeCoins.length > 0 && (
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-100 px-5 py-3">
            <p className="text-lg font-semibold text-amber-900">Here&rsquo;s your change</p>
            <ul className="flex items-center gap-2">
              {changeCoins.map((coin, i) => (
                <li key={`${coin}-${i}`}>
                  <CoinSVG value={coin} scale={0.72} seed={i} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </button>
  );
}
