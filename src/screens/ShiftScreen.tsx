/* =============================================================================
 * THE BAKERY SHIFT — she works behind the counter.
 *
 * In the spirit of "Good Pizza, Great Pizza": a regular walks in and asks for
 * something, she makes it, rings the bell, takes their coins and counts change
 * out of the till. Each happy customer drops 1p in the tip jar. After the last
 * one she is paid her wage and takes the tip jar home.
 *
 * What it deliberately does NOT borrow: there is no timer, no patience meter,
 * no rating, no star and no upgrade shop. A customer waits as long as she needs.
 * A wrong order or wrong change gets one calm line and nothing else — nothing
 * moves, nothing is lost, nothing is recorded against her.
 *
 * This is NOT a second payment implementation. She is not paying for anything:
 * the till is the bakery's and none of its coins are hers. Her own purse is
 * never touched until the wages land at the very end.
 *
 * TAP, NEVER DRAG. Every action here is a tap.
 * ============================================================================= */

import { useEffect, useState, type ReactNode } from 'react';
import CoinSVG from '../components/coins/CoinSVG';
import CustomerArt, { type CustomerMood } from '../components/CustomerArt';
import ItemArt from '../components/ItemArt';
import PriceTag from '../components/PriceTag';
import { BunWithToppings, TOPPING_NAME, ToppingIcon } from '../components/ToppingArt';
import { BAKERY_ITEMS, SHIFT_BASE_WAGE, SHIFT_CUSTOMERS } from '../data/economy';
import { coinsForStage, formatMoney, minimumCoins, totalOf } from '../engine';
import { CAST, TOPPINGS, hasWorkedThisWeek, type Customer } from '../engine/shift';
import type { CoinValue, Stage } from '../engine/types';
import {
  currentCustomer,
  shiftFinished,
  tipsSoFar,
  type GameState,
} from '../state/gameReducer';
import { useGame } from '../state/GameContext';

const ACCENT = '#e07a5f';

/* ---------------------------------------------------------------------------
 * Small pieces
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

function Bell() {
  return (
    <svg viewBox="0 0 48 40" className="h-12 w-14" role="presentation">
      <rect x="4" y="32" width="40" height="5" rx="2.5" fill="#8a6a2a" />
      <path d="M8 32 Q8 10 24 10 Q40 10 40 32 Z" fill="#e3b341" />
      <path d="M14 26 Q16 16 24 15" stroke="#fff6" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="7" r="3.5" fill="#c9962a" />
    </svg>
  );
}

/** The tip jar: a glass jar with as many pennies in it as customers served. */
function TipJar({ pennies }: { pennies: number }) {
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5"
      aria-label={`Tip jar: ${pennies}p`}
      data-testid="tip-jar"
      data-pennies={pennies}
    >
      <svg viewBox="0 0 40 44" className="h-9 w-8" role="presentation">
        <rect x="10" y="2" width="20" height="6" rx="2" fill="#c9962a" />
        <path d="M8 8 H32 Q36 8 36 14 V38 Q36 42 32 42 H8 Q4 42 4 38 V14 Q4 8 8 8 Z" fill="#dff1f7" opacity="0.9" />
        {Array.from({ length: pennies }, (_, i) => (
          <circle key={i} cx={12 + (i % 3) * 8} cy={37 - Math.floor(i / 3) * 6} r="3.6" fill="#b87333" stroke="#8a5424" strokeWidth="0.8" />
        ))}
      </svg>
      <span className="text-xl font-black tabular-nums">{pennies}p</span>
    </div>
  );
}

/** One little face per customer in today's queue. Not a score — just where we are. */
function Queue({ served, current }: { served: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Customer ${current + 1} of ${SHIFT_CUSTOMERS}`}>
      {Array.from({ length: SHIFT_CUSTOMERS }, (_, i) => (
        <span
          key={i}
          className={[
            'h-4 w-4 rounded-full border-2 border-white transition',
            i < served ? 'bg-white' : i === current ? 'bg-white/60 scale-125' : 'bg-transparent',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

function Header({ state, onBack }: { state: GameState; onBack: () => void }) {
  const finished = shiftFinished(state);
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b-4 border-amber-900/15 px-3 py-1.5 text-white"
      style={{ backgroundColor: ACCENT }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to the street"
        className="tappable rounded-full bg-white/25 p-1 active:scale-90"
      >
        <BackArrow />
      </button>
      <h1 className="text-2xl font-black tracking-wide">Bakery shift</h1>
      {!finished && <Queue served={tipsSoFar(state)} current={state.shift.customerIndex} />}
      <div className="ml-auto">
        <TipJar pennies={tipsSoFar(state)} />
      </div>
    </div>
  );
}

/** The order as pictures, so it works for a child who cannot read yet. */
function OrderPictures({ customer, size = 64 }: { customer: Customer; size?: number }) {
  return (
    <div className="flex items-end gap-3" data-testid="order" data-items={customer.itemIds.join(",")} data-topping-kind={customer.toppings?.kind ?? ""}>
      {customer.itemIds.map((id, i) => (
        <div key={`${id}-${i}`} className="flex flex-col items-center gap-1">
          <ItemArt id={id} size={size} />
          {id === 'iced_bun' && customer.toppings !== null && (
            <div
              className="flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-0.5"
              data-testid="order-toppings"
              data-count={customer.toppings.count}
            >
              <span className="flex max-w-[11rem] flex-wrap justify-center">
                {Array.from({ length: customer.toppings.count }, (_, k) => (
                  <ToppingIcon key={k} kind={customer.toppings?.kind ?? 'cherry'} size={24} />
                ))}
              </span>
              <span className="text-xl font-black tabular-nums text-rose-900">
                {customer.toppings.count}
              </span>
            </div>
          )}
          {id === 'iced_bun' && customer.toppings === null && (
            <span className="rounded-xl bg-rose-50 px-2 py-0.5 text-sm font-bold text-rose-900">plain</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SpeechBubble({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="speech"
      className="relative flex min-w-[16rem] max-w-[34rem] flex-col gap-2 rounded-3xl border-4 border-amber-900/15 bg-white px-5 py-3 shadow-lg"
    >
      {/* Tail pointing at the customer on the left */}
      <span className="absolute -left-4 top-10 h-0 w-0 border-y-[12px] border-r-[16px] border-y-transparent border-r-white" />
      {children}
    </div>
  );
}

function Line({ children }: { children: ReactNode }) {
  return <p className="text-2xl font-bold leading-snug text-amber-950">{children}</p>;
}

/* ---------------------------------------------------------------------------
 * What the customer says
 * ------------------------------------------------------------------------- */

function whatTheySay(state: GameState, customer: Customer, stage: Stage): { mood: CustomerMood; node: ReactNode } {
  const { shift } = state;
  const who = CAST[customer.look] ?? CAST[0];
  const paid = totalOf([...customer.handedOver]);

  if (shift.phase === 'make') {
    const r = shift.orderReply;
    if (r === null) {
      return {
        mood: 'waiting',
        node: (
          <>
            <Line>
              {who.hello} Can I have…
            </Line>
            <OrderPictures customer={customer} size={88} />
          </>
        ),
      };
    }
    const line =
      r.kind === 'missing'
        ? 'Hmm, I think something’s missing.'
        : r.kind === 'extra'
          ? 'Oh! That’s more than I asked for.'
          : r.kind === 'toppings' && customer.toppings !== null
            ? `Can you count the ${TOPPING_NAME[r.topping].many} again?`
            : 'I’d like my bun plain, please.';
    return {
      mood: 'thinking',
      node: (
        <>
          <Line>{line}</Line>
          <OrderPictures customer={customer} size={64} />
        </>
      ),
    };
  }

  if (shift.phase === 'change') {
    const r = shift.reply;
    if (r === null) {
      return {
        mood: 'waiting',
        node: <Line>Lovely, thank you! Here’s my money.</Line>,
      };
    }
    const hint =
      shift.tries >= 2 && customer.changeDue > 0 ? (
        <p className="text-lg font-semibold text-sky-800">
          Count up from {formatMoney(customer.price, stage)} to {formatMoney(paid, stage)}.
        </p>
      ) : null;
    const line =
      customer.changeDue === 0
        ? 'I gave you just the right money — no change needed!'
        : r.kind === 'short'
          ? 'I think I need a bit more change.'
          : 'That’s a bit too much change.';
    return {
      mood: 'thinking',
      node: (
        <>
          <Line>{line}</Line>
          {hint}
        </>
      ),
    };
  }

  return {
    mood: 'happy',
    node: <Line>Thank you! Here’s a penny for your tip jar. Bye!</Line>,
  };
}

/* ---------------------------------------------------------------------------
 * The shop floor: the customer and what they are saying
 * ------------------------------------------------------------------------- */

function ShopFloor({ state, customer }: { state: GameState; customer: Customer }) {
  const { mood, node } = whatTheySay(state, customer, state.save.stage);
  const who = CAST[customer.look] ?? CAST[0];

  // Each customer walks in from the right. CSS transitions only.
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    setArrived(false);
    const t = setTimeout(() => setArrived(true), 30);
    return () => clearTimeout(t);
  }, [state.shift.customerIndex]);

  return (
    <div className="relative flex min-h-0 flex-1 items-end gap-5 overflow-hidden bg-gradient-to-b from-[#fbe9d0] to-[#f6dcb8] px-6 pt-2">
      {/* The back wall: a window onto the street, and a shelf of bread */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-8 pt-4">
        <div className="relative ml-[22rem] h-36 w-64 overflow-hidden rounded-t-[4rem] border-[10px] border-[#b97a45] bg-gradient-to-b from-sky-300 to-sky-100">
          <div className="absolute inset-x-0 bottom-0 h-8 bg-stone-300" />
          <div className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-[#b97a45]" />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex gap-2 px-3">
            {BAKERY_ITEMS.map((item) => (
              <ItemArt key={item.id} id={item.id} size={56} />
            ))}
          </div>
          <div className="h-3 w-full rounded bg-[#9c6329]" />
        </div>
      </div>

      <div
        className="flex shrink-0 flex-col items-center transition-all duration-700 ease-out"
        style={{
          transform: arrived ? 'translateX(0)' : 'translateX(60vw)',
          opacity: arrived ? 1 : 0,
        }}
        data-testid="customer"
        data-look={customer.look}
      >
        <CustomerArt look={customer.look} mood={mood} size={250} />
      </div>

      <div
        className="relative mb-10 flex flex-col gap-1 transition-opacity duration-500"
        style={{ opacity: arrived ? 1 : 0, transitionDelay: arrived ? '450ms' : '0ms' }}
      >
        <span className="ml-3 text-lg font-black text-amber-900/70">{who.name}</span>
        <SpeechBubble>{node}</SpeechBubble>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Phase 1 — making the order
 * ------------------------------------------------------------------------- */

function MakeCounter({ state }: { state: GameState }) {
  const { dispatch } = useGame();
  const { tray, toppings } = state.shift;
  const hasBun = tray.includes('iced_bun');

  return (
    <div className="flex h-full gap-2">
      {/* The bakery's shelf: tap to put something on the tray. */}
      <div className="flex w-[19rem] shrink-0 flex-wrap content-center justify-center gap-1.5 rounded-2xl bg-amber-900/10 p-2">
        {BAKERY_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.name}
            data-testid="shelf-item"
            data-item-id={item.id}
            onClick={() => dispatch({ type: 'trayAdd', itemId: item.id })}
            className="tappable flex h-[5.6rem] w-[5.6rem] items-center justify-center rounded-2xl border-4 border-amber-900/15 bg-white/85 shadow active:scale-95"
          >
            <ItemArt id={item.id} size={66} />
          </button>
        ))}
      </div>

      {/* The serving tray */}
      <div
        className="flex min-w-0 flex-1 items-center justify-center gap-3 rounded-[2rem] border-4 border-stone-400/50 bg-stone-200/70 px-3 shadow-inner"
        data-testid="tray"
        data-count={tray.length}
      >
        {tray.length === 0 && (
          <span className="text-5xl font-black text-stone-400/60" aria-hidden="true">
            ?
          </span>
        )}
        {tray.map((id, i) =>
          id === 'iced_bun' ? (
            <BunWithToppings
              key={`${id}-${i}`}
              toppings={toppings}
              size={150}
              onRemove={(kind) => dispatch({ type: 'toppingRemove', topping: kind })}
            />
          ) : (
            <button
              key={`${id}-${i}`}
              type="button"
              aria-label="Take off the tray"
              data-testid="tray-item"
              onClick={() => dispatch({ type: 'trayRemove', position: i })}
              className="tappable rounded-2xl active:scale-95"
            >
              <ItemArt id={id} size={92} />
            </button>
          ),
        )}
        {hasBun && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'trayRemove', position: tray.indexOf('iced_bun') })}
            className="tappable self-end mb-2 rounded-full bg-stone-500/20 px-3 py-1 text-sm font-semibold text-stone-600 active:scale-95"
          >
            Take bun off
          </button>
        )}
      </div>

      {/* Toppings — only once there is a bun to put them on */}
      <div className="flex w-[6.5rem] shrink-0 flex-col justify-center gap-2">
        {TOPPINGS.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={!hasBun}
            aria-label={`Add a ${TOPPING_NAME[kind].one}`}
            data-testid="topping-button"
            data-kind={kind}
            onClick={() => dispatch({ type: 'toppingAdd', topping: kind })}
            className={[
              'tappable flex h-[5.4rem] flex-col items-center justify-center rounded-2xl border-4 transition',
              hasBun
                ? 'border-rose-300 bg-rose-50 shadow active:scale-95'
                : 'border-stone-300 bg-stone-100 opacity-40',
            ].join(' ')}
          >
            <span className="flex">
              <ToppingIcon kind={kind} size={30} />
              <ToppingIcon kind={kind} size={30} />
            </span>
            <span className="text-2xl font-black tabular-nums text-rose-900">{toppings[kind]}</span>
          </button>
        ))}
      </div>

      {/* Ring the bell to serve */}
      <button
        type="button"
        disabled={tray.length === 0}
        onClick={() => dispatch({ type: 'serve' })}
        data-testid="serve"
        className={[
          'tappable flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 text-2xl font-black shadow-lg transition',
          tray.length > 0
            ? 'border-emerald-800/30 bg-emerald-500 text-white active:scale-95'
            : 'border-stone-300 bg-stone-200 text-stone-400',
        ].join(' ')}
      >
        <Bell />
        Serve
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Phase 2 — taking the money and giving change
 * ------------------------------------------------------------------------- */

function ChangeCounter({ state, customer }: { state: GameState; customer: Customer }) {
  const { dispatch } = useGame();
  const { stage } = state.save;
  const { given } = state.shift;
  const paid = totalOf([...customer.handedOver]);
  const prices = customer.itemIds.map((id) => BAKERY_ITEMS.find((i) => i.id === id)?.price ?? 0);
  const till: CoinValue[] = coinsForStage(stage).sort((a, b) => a - b);
  const givenTotal = totalOf(given);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex min-h-0 flex-1 gap-2">
        {/* What it costs, and what they handed over */}
        <div className="flex w-[19rem] shrink-0 flex-col justify-center gap-2 rounded-2xl bg-amber-900/10 p-2">
          <div className="flex items-center gap-2" data-testid="order-price" data-price={customer.price}>
            <span className="text-lg font-bold text-amber-900/70">Costs</span>
            {prices.length > 1 && (
              <span className="text-xl font-bold tabular-nums text-amber-900">
                {prices.map((p) => formatMoney(p, stage)).join(' + ')} =
              </span>
            )}
            <PriceTag price={customer.price} stage={stage} large />
          </div>
          <div className="flex items-center gap-2" data-testid="handed-over" data-paid={paid}>
            <span className="text-lg font-bold text-amber-900/70">They gave</span>
            <ul className="flex flex-wrap items-center gap-1">
              {customer.handedOver.map((coin, i) => (
                <li key={`${coin}-${i}`}>
                  <CoinSVG value={coin} scale={0.8} seed={i + 40} />
                </li>
              ))}
            </ul>
            <span className="text-2xl font-black tabular-nums text-amber-900">{formatMoney(paid, stage)}</span>
          </div>
        </div>

        {/* The change she is counting out */}
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border-4 border-amber-900/20 bg-amber-100/60 p-2">
          <div className="flex shrink-0 items-baseline justify-between">
            <span className="text-lg font-bold text-amber-900/70">Change</span>
            <span className="text-3xl font-black tabular-nums text-amber-900" data-testid="change-total">
              {formatMoney(givenTotal, stage)}
            </span>
            {given.length > 0 ? (
              <button
                type="button"
                onClick={() => dispatch({ type: 'tillClear' })}
                className="tappable rounded-full bg-amber-900/10 px-3 py-0.5 text-sm font-semibold text-amber-900/70 active:scale-95"
              >
                Put back
              </button>
            ) : (
              <span className="w-20" />
            )}
          </div>
          <ul className="mt-1 flex min-h-0 flex-1 flex-wrap content-start justify-center gap-1.5 overflow-y-auto">
            {given.map((coin, i) => (
              <li key={`${coin}-${i}`}>
                <button
                  type="button"
                  aria-label="Put back in the till"
                  onClick={() => dispatch({ type: 'tillRemove', position: i })}
                  className="tappable rounded-full active:scale-90"
                >
                  <CoinSVG value={coin} scale={0.85} seed={i} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'giveChange' })}
          data-testid="give-change"
          className="tappable w-32 shrink-0 rounded-2xl border-4 border-emerald-800/30 bg-emerald-500 text-2xl font-black leading-tight text-white shadow-lg active:scale-95"
        >
          {given.length === 0 ? 'No change' : 'Give change'}
        </button>
      </div>

      {/* The till: as many of each coin as she needs. None of it is hers. */}
      <div
        className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border-4 border-stone-500/30 bg-stone-300/70 px-3 py-1.5"
        data-testid="till"
      >
        <span className="text-lg font-black text-stone-600">Till</span>
        {till.map((coin) => (
          <button
            key={coin}
            type="button"
            aria-label={`Take ${formatMoney(coin, stage)} from the till`}
            data-testid="till-coin"
            data-value={coin}
            onClick={() => dispatch({ type: 'tillAdd', coin })}
            className="tappable rounded-full active:scale-90"
          >
            <CoinSVG value={coin} scale={0.9} seed={coin} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Phase 3 — thank you, and a penny in the jar
 * ------------------------------------------------------------------------- */

function ThanksCounter({ last }: { last: boolean }) {
  const { dispatch } = useGame();
  const [dropped, setDropped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDropped(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full items-center justify-center gap-8">
      <div
        className="transition-all duration-700 ease-in"
        style={{
          transform: dropped ? 'translate(38vw, -42vh) scale(0.4)' : 'none',
          opacity: dropped ? 0 : 1,
        }}
      >
        <CoinSVG value={1} scale={1.4} seed={7} />
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: 'nextCustomer' })}
        data-testid="next-customer"
        className="tappable h-24 rounded-3xl border-4 border-emerald-800/30 bg-emerald-500 px-12 text-3xl font-black text-white shadow-lg active:scale-95"
      >
        {last ? 'Close the shop' : 'Next customer'}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * End of shift — pay day
 * ------------------------------------------------------------------------- */

function PayDay({ stage }: { stage: Stage }) {
  const { state, dispatch } = useGame();
  const [taken, setTaken] = useState(false);
  const wage = minimumCoins(SHIFT_BASE_WAGE, stage);
  const tips: CoinValue[] = Array.from({ length: SHIFT_CUSTOMERS }, () => 1 as const);
  const worked = hasWorkedThisWeek(state.save.shiftWeek, state.save.week);

  useEffect(() => {
    if (!taken) return undefined;
    const t = setTimeout(() => dispatch({ type: 'go', screen: 'street' }), 1100);
    return () => clearTimeout(t);
  }, [taken, dispatch]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#fbe9d0] to-[#f6dcb8] p-6" data-testid="pay-day">
      <h2 className="text-4xl font-black text-amber-900">All done! Thank you for your help.</h2>
      <div className="flex items-stretch gap-6">
        <PayPile label="Your pay" coins={wage} stage={stage} taken={taken} />
        <PayPile label="Tip jar" coins={tips} stage={stage} taken={taken} />
      </div>
      {!taken && !worked && (
        <button
          type="button"
          data-testid="collect-wages"
          onClick={() => {
            dispatch({ type: 'collectWages' });
            setTaken(true);
          }}
          className="tappable h-20 rounded-3xl border-4 border-emerald-800/30 bg-emerald-500 px-12 text-3xl font-black text-white shadow-lg active:scale-95"
        >
          Take it home
        </button>
      )}
    </div>
  );
}

function PayPile({ label, coins, stage, taken }: { label: string; coins: CoinValue[]; stage: Stage; taken: boolean }) {
  return (
    <div className="flex min-w-[14rem] flex-col items-center gap-2 rounded-3xl border-4 border-amber-900/15 bg-white px-6 py-4 shadow">
      <span className="text-xl font-bold text-amber-900/70">{label}</span>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {coins.map((coin, i) => (
          <li
            key={`${coin}-${i}`}
            className="transition-all duration-700 ease-in"
            style={
              taken
                ? { transform: 'translateY(-50vh) scale(0.35)', opacity: 0, transitionDelay: `${i * 60}ms` }
                : undefined
            }
          >
            <CoinSVG value={coin} seed={i + 90} />
          </li>
        ))}
      </ul>
      <span className="text-3xl font-black tabular-nums text-amber-900">{formatMoney(totalOf(coins), stage)}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------- */

export default function ShiftScreen() {
  const { state, dispatch } = useGame();
  const { save, shift } = state;
  const worked = hasWorkedThisWeek(save.shiftWeek, save.week);
  const finished = shiftFinished(state);
  const customer = currentCustomer(state);
  const back = () => dispatch({ type: 'go', screen: 'street' });

  let body: ReactNode;
  if (worked && !finished) {
    // She has already worked this week. One shift a week; nothing else to say.
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#fbe9d0] p-6" data-testid="shift-closed">
        <CustomerArt look={4} mood="happy" size={150} />
        <p className="text-3xl font-black text-amber-900">Thanks for your help this week!</p>
        <p className="text-2xl font-semibold text-amber-800">Come back next week.</p>
      </div>
    );
  } else if (finished || customer === null) {
    body = <PayDay stage={save.stage} />;
  } else {
    body = (
      <div className="flex h-full flex-col">
        <ShopFloor state={state} customer={customer} />
        {/* The counter top */}
        <div className="h-3 shrink-0 bg-[#9c6329] shadow" />
        <div
          className="h-[17.5rem] shrink-0 bg-[#c98b4b]/30 p-2"
          data-testid="work-area"
          data-phase={shift.phase}
        >
          {shift.phase === 'make' && <MakeCounter state={state} />}
          {shift.phase === 'change' && <ChangeCounter state={state} customer={customer} />}
          {shift.phase === 'thanks' && (
            <ThanksCounter key={shift.customerIndex} last={shift.customerIndex === SHIFT_CUSTOMERS - 1} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-[#fdf6e8]" data-testid="shift-screen">
      <Header state={state} onBack={back} />
      <div className="min-h-0 flex-1">{body}</div>
    </div>
  );
}
