/* =============================================================================
 * THE SHOP — one implementation, four shops.
 *
 * There is exactly ONE payment implementation in this game and it lives here.
 * The bakery, the greengrocer, the toy shop and the charity shop are thin
 * wrappers around this component: same counter, same purse tray, same running
 * total, same Pay button, same outcomes. If a second coin tray, a second
 * running total or a second Pay button ever appears in this codebase, one of
 * them is a bug.
 *
 * TAP TO PAY, NOT DRAG — HTML5 drag-and-drop does not work in iOS Safari and
 * drag gestures are unreliable for a six-year-old. There are no drag handlers
 * anywhere in this file.
 *
 * MONEY IS INTEGER PENCE. Nothing here does arithmetic on money except adding
 * whole coins together, and every amount reaches the screen through
 * formatMoney().
 * ============================================================================= */

import { useMemo, useRef, type ReactNode } from 'react';
import CoinTray, { type HeldCoin } from './CoinTray';
import Counter from './Counter';
import ItemArt from './ItemArt';
import PriceTag from './PriceTag';
import CoinSVG from './coins/CoinSVG';
import { canMakeExactlyFrom, formatMoney } from '../engine';
import type { ShopItem, Stage } from '../engine/types';
import {
  paymentTotal,
  type Outcome,
  type ShopScreen as ShopScreenId,
} from '../state/gameReducer';
import { useGame } from '../state/GameContext';

/** How a price is drawn. `large` is the ticket on the item she is buying. */
export type PriceRenderer = (item: ShopItem, opts: { large: boolean }) => ReactNode;

export interface ShopScreenProps {
  shopId: ShopScreenId;
  title: string;
  /** Header colour. Matches the shop's awning on the street. */
  accent: string;
  /** Already filtered for this week where that applies (the charity shop). */
  items: readonly ShopItem[];
  /** The charity shop overrides this to show BOTH prices. */
  renderPrice?: PriceRenderer | undefined;
  /** The toy shop only: a saving-goal bookmark on every item. */
  showGoalStar?: boolean | undefined;
  /** True => visible and priced, but not purchasable yet. */
  stageGate?: ((item: ShopItem) => boolean) | undefined;
  /** Shelf geometry: nine items need smaller cards than five do. */
  cardWidth?: number | undefined;
  artSize?: number | undefined;
  columns?: number | undefined;
  /** Put on every card button, for the live verification script. */
  itemTestId?: string | undefined;
}

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

function Tick() {
  return (
    <svg viewBox="0 0 48 48" className="h-16 w-16" role="presentation">
      <circle cx="24" cy="24" r="22" fill="#34a853" />
      <path
        d="M13 25 L21 33 L35 16"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * The saving-goal bookmark.
 *
 * NOT a reward. Nothing in this game is won by earning stars — this is a
 * bookmark she puts on the thing she is saving up for, and she can take it off
 * again. It sits in its own hit area above the card so tapping it never also
 * puts the item on the counter.
 */
function GoalStar({
  item,
  isGoal,
  onToggle,
}: {
  item: ShopItem;
  isGoal: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isGoal}
      aria-label={isGoal ? `Stop saving for ${item.name}` : `Save for ${item.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={[
        'tappable absolute -right-1 -top-1 flex h-11 w-11 items-center justify-center rounded-full border-4 transition active:scale-90',
        isGoal ? 'border-amber-500 bg-amber-300 shadow-md' : 'border-stone-300 bg-white shadow',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" role="presentation">
        <path
          d="M12 3 L14.7 9.1 L21 9.8 L16.3 14.1 L17.6 20.4 L12 17.2 L6.4 20.4 L7.7 14.1 L3 9.8 L9.3 9.1 Z"
          fill={isGoal ? '#f59e0b' : 'none'}
          stroke={isGoal ? '#b45309' : '#a8a29e'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function ShopScreen({
  shopId,
  title,
  accent,
  items,
  renderPrice,
  showGoalStar = false,
  stageGate,
  cardWidth,
  artSize,
  columns,
  itemTestId,
}: ShopScreenProps) {
  const { state, dispatch } = useGame();
  const { purse, stage, savingGoal } = state.save;
  const { selectedItemId, paidIndices, outcome } = state.payment;

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

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
  const canPay = paymentCoins.length > 0 && selectedItem !== null;

  /*
   * §7 — not having the right coins.
   *
   * Recorded when Pay is pressed, from the purse AS IT WAS before the coins
   * left it, because by the time the outcome renders the purse has already
   * changed. Surfaced only afterwards, in the change message: Pay is never
   * disabled, the purchase is never blocked, and she is never warned in
   * advance that her coins will not make the price exactly.
   */
  const exactWasPossible = useRef(true);

  return (
    <div className="relative flex h-full flex-col bg-[#fdf6e8]">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 border-b-4 border-amber-900/15 px-3 py-1.5 text-white"
        style={{ backgroundColor: accent }}
      >
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'street' })}
          aria-label="Back to the street"
          className="tappable rounded-full bg-white/25 p-1 active:scale-90"
        >
          <BackArrow />
        </button>
        <h1 className="text-2xl font-black tracking-wide">{title}</h1>
        {/* The purse total lives in the meter bar above, on every screen. */}
      </div>

      {/* Shelf */}
      <div
        data-testid="shop-shelf"
        data-shop-id={shopId}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-1 pt-2"
      >
        <Counter
          items={items}
          stage={stage}
          selectedId={selectedItemId}
          onSelect={(id) => dispatch({ type: 'selectItem', itemId: id })}
          cardWidth={cardWidth}
          artSize={artSize}
          columns={columns}
          itemTestId={itemTestId}
          isLocked={stageGate}
          renderPrice={
            renderPrice === undefined ? undefined : (item) => renderPrice(item, { large: false })
          }
          renderCorner={
            showGoalStar
              ? (item) => (
                  <GoalStar
                    item={item}
                    isGoal={savingGoal === item.id}
                    onToggle={() =>
                      dispatch({
                        type: 'setSavingGoal',
                        itemId: savingGoal === item.id ? null : item.id,
                      })
                    }
                  />
                )
              : undefined
          }
        />
      </div>

      {/* Payment area. Fixed height: the shelf above it flexes, this never
          moves, so the coins do not jump around under her finger. */}
      <div className="flex h-56 shrink-0 gap-2 px-2 pb-1">
        {/* What she is buying */}
        <div className="flex w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-dashed border-amber-900/20 bg-white/50 p-2">
          {selectedItem === null ? (
            <span className="text-5xl font-black opacity-20" aria-hidden="true">
              ?
            </span>
          ) : (
            <>
              <ItemArt id={selectedItem.id} size={72} />
              {renderPrice === undefined ? (
                <PriceTag price={selectedItem.price} stage={stage} large />
              ) : (
                renderPrice(selectedItem, { large: true })
              )}
            </>
          )}
        </div>

        {/* Coins she has put down */}
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border-4 border-amber-900/20 bg-amber-100/60 p-2">
          <div className="flex shrink-0 items-baseline justify-between">
            <span className="text-3xl font-black tabular-nums text-amber-900">
              {formatMoney(total, stage)}
            </span>
            {paymentCoins.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'clearPayment' })}
                className="tappable rounded-full bg-amber-900/10 px-3 py-0.5 text-sm font-semibold text-amber-900/70 active:scale-95"
              >
                Take back
              </button>
            )}
          </div>
          <CoinTray
            coins={paymentCoins}
            onTapCoin={(index) => dispatch({ type: 'removeCoin', index })}
            scale={0.85}
            className="mt-1 min-h-0 flex-1 content-start justify-center overflow-y-auto"
          />
        </div>

        {/* Pay. Never disabled for want of the right coins — only for want of
            an item or a coin on the counter. */}
        <button
          type="button"
          disabled={!canPay}
          onClick={() => {
            if (selectedItem === null) return;
            exactWasPossible.current = canMakeExactlyFrom(selectedItem.price, purse);
            dispatch({
              type: 'pay',
              itemId: selectedItem.id,
              price: selectedItem.price,
              isFood: selectedItem.isFood,
              ts: Date.now(),
            });
          }}
          className={[
            'tappable w-32 shrink-0 rounded-2xl border-4 text-3xl font-black shadow-lg transition',
            canPay
              ? 'border-emerald-800/30 bg-emerald-500 text-white active:scale-95'
              : 'border-stone-300 bg-stone-200 text-stone-400',
          ].join(' ')}
        >
          Pay
        </button>
      </div>

      {/* Her purse, along the bottom */}
      <div
        data-testid="purse-tray"
        className="shrink-0 border-t-4 border-amber-900/15 bg-amber-200/50 px-2 py-1.5"
      >
        {/* Capped at two rows so a fat purse can never push the shelf off the
            top of the screen. Coins stay at full tappable size. */}
        <CoinTray
          coins={trayCoins}
          onTapCoin={(index) => dispatch({ type: 'addCoin', index })}
          scale={0.92}
          className="max-h-44 justify-center gap-2 overflow-y-auto"
          empty={<div className="h-16" />}
        />
      </div>

      {outcome !== null && (
        <OutcomeOverlay
          outcome={outcome}
          items={items}
          stage={stage}
          exactWasPossible={exactWasPossible.current}
          onDismiss={() => dispatch({ type: 'dismissOutcome' })}
        />
      )}
    </div>
  );
}

function OutcomeOverlay({
  outcome,
  items,
  stage,
  exactWasPossible,
  onDismiss,
}: {
  outcome: Outcome;
  items: readonly ShopItem[];
  stage: Stage;
  exactWasPossible: boolean;
  onDismiss: () => void;
}) {
  if (outcome.kind === 'short') {
    // Gentle and non-punishing. Nothing was deducted, nothing was lost, the
    // coins stayed exactly where she put them, and this is not a failure.
    return (
      <button
        type="button"
        data-testid="outcome-overlay"
        data-outcome="short"
        onClick={onDismiss}
        className="tappable absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-sky-900/35 backdrop-blur-[2px]"
      >
        <div className="flex flex-col items-center gap-2 rounded-3xl border-4 border-sky-200 bg-white px-8 py-6 shadow-2xl">
          <span className="text-5xl" aria-hidden="true">
            🙂
          </span>
          <p className="text-2xl font-bold text-sky-900">That&rsquo;s not quite enough yet.</p>
          <p className="text-lg text-sky-700">Try adding another coin.</p>
        </div>
      </button>
    );
  }

  const item = items.find((i) => i.id === outcome.itemId);
  const change = outcome.kind === 'over' ? outcome.changeCoins : [];

  return (
    <button
      type="button"
      data-testid="outcome-overlay"
      data-outcome={outcome.kind}
      onClick={onDismiss}
      className="tappable absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-emerald-900/35 backdrop-blur-[2px]"
    >
      <div className="flex flex-col items-center gap-3 rounded-3xl border-4 border-emerald-200 bg-white px-8 py-5 shadow-2xl">
        <Tick />
        {item !== undefined && (
          <div className="flex items-center gap-3">
            <ItemArt id={item.id} size={56} />
            <p className="text-2xl font-bold text-emerald-900">{item.name}</p>
          </div>
        )}
        {change.length > 0 && (
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-100 px-5 py-3">
            <p className="text-lg font-semibold text-amber-900">
              {/* §7: acknowledged only after the fact, and only when she really
                  could not have made the price exactly. Never a warning. */}
              {exactWasPossible
                ? 'Here’s your change'
                : 'You didn’t have the right coins, so here’s your change.'}
            </p>
            <ul className="flex items-center gap-2">
              {change.map((coin, i) => (
                <li key={`${coin}-${i}`} className="flex flex-col items-center">
                  <CoinSVG value={coin} scale={0.72} seed={i} />
                </li>
              ))}
            </ul>
            {change.length > 1 && (
              <p className="text-xl font-black tabular-nums text-amber-900">
                {formatMoney(
                  change.reduce<number>((sum, coin) => sum + coin, 0),
                  stage,
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
