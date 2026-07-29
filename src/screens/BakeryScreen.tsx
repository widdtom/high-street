import { useMemo } from 'react';
import CoinTray, { type HeldCoin } from '../components/CoinTray';
import Counter from '../components/Counter';
import ItemArt from '../components/ItemArt';
import PriceTag from '../components/PriceTag';
import CoinSVG from '../components/coins/CoinSVG';
import { BAKERY_ITEMS } from '../data/economy';
import { formatMoney } from '../engine';
import { paymentTotal } from '../state/gameReducer';
import { useGame } from '../state/GameContext';

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
 * The bakery. Tap an item, tap coins to build a payment, tap Pay.
 *
 * TAP TO PAY, NOT DRAG — HTML5 drag-and-drop does not work in iOS Safari and
 * drag gestures are unreliable for a six-year-old. There are no drag handlers
 * anywhere in this file.
 */
export default function BakeryScreen() {
  const { state, dispatch } = useGame();
  const { purse, stage } = state.save;
  const { selectedItemId, paidIndices, outcome } = state.bakery;

  const selectedItem = useMemo(
    () => BAKERY_ITEMS.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId],
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

  return (
    <div className="relative flex h-full flex-col bg-[#fdf6e8]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b-4 border-amber-900/15 bg-[#e07a5f] px-3 py-1.5 text-white">
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'street' })}
          aria-label="Back to the street"
          className="tappable rounded-full bg-white/25 p-1 active:scale-90"
        >
          <BackArrow />
        </button>
        <h1 className="text-2xl font-black tracking-wide">Bakery</h1>
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'purse' })}
          aria-label="Purse"
          className="tappable ml-auto rounded-full bg-white/25 px-3 py-1 text-lg font-bold active:scale-95"
        >
          {formatMoney(
            purse.reduce<number>((sum, coin) => sum + coin, 0),
            stage,
          )}
        </button>
      </div>

      {/* Shelf */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1 pt-2">
        <Counter
          items={BAKERY_ITEMS}
          stage={stage}
          selectedId={selectedItemId}
          onSelect={(id) => dispatch({ type: 'selectItem', itemId: id })}
        />
      </div>

      {/* Payment area */}
      <div className="flex h-80 shrink-0 gap-2 px-2 pb-1">
        {/* What she is buying */}
        <div className="flex w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-dashed border-amber-900/20 bg-white/50 p-2">
          {selectedItem === null ? (
            <span className="text-5xl font-black opacity-20" aria-hidden="true">
              ?
            </span>
          ) : (
            <>
              <ItemArt id={selectedItem.id} size={72} />
              <PriceTag price={selectedItem.price} stage={stage} large />
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

        {/* Pay */}
        <button
          type="button"
          disabled={!canPay}
          onClick={() => {
            if (selectedItem === null) return;
            dispatch({
              type: 'pay',
              itemId: selectedItem.id,
              price: selectedItem.price,
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
      <div className="shrink-0 border-t-4 border-amber-900/15 bg-amber-200/50 px-2 py-1.5">
        <CoinTray
          coins={trayCoins}
          onTapCoin={(index) => dispatch({ type: 'addCoin', index })}
          scale={0.92}
          className="justify-center gap-2"
          empty={<div className="h-16" />}
        />
      </div>

      {outcome !== null && <OutcomeOverlay />}
    </div>
  );
}

function OutcomeOverlay() {
  const { state, dispatch } = useGame();
  const outcome = state.bakery.outcome;
  if (outcome === null) return null;

  const dismiss = () => dispatch({ type: 'dismissOutcome' });

  if (outcome.kind === 'short') {
    // Gentle and non-punishing. Nothing was deducted, nothing was lost, and
    // this is not presented as a failure.
    return (
      <button
        type="button"
        onClick={dismiss}
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

  const item = BAKERY_ITEMS.find((i) => i.id === outcome.itemId);

  return (
    <button
      type="button"
      onClick={dismiss}
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
        {outcome.kind === 'over' && outcome.changeCoins.length > 0 && (
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-100 px-5 py-3">
            <p className="text-lg font-semibold text-amber-900">Here&rsquo;s your change</p>
            <ul className="flex items-center gap-2">
              {outcome.changeCoins.map((coin, i) => (
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
