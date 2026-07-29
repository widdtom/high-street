/* =============================================================================
 * THE MONEY BOX
 *
 * MONEY IS INTEGER PENCE, and both piles are LISTS OF COINS, never balances.
 * She physically moves a coin from her purse into the box, and back out again.
 *
 * TWO-WAY, FREELY. No lock, no minimum, no interest, no penalty for taking a
 * coin back out. The bank arrives later; this exists so that the *choice* to
 * set money aside exists first. Taking money out is not a mistake and is never
 * presented as one.
 * ============================================================================= */

import { useMemo } from 'react';
import CoinTray, { type HeldCoin } from './CoinTray';
import ItemArt from './ItemArt';
import { itemById } from '../data/economy';
import { formatMoney } from '../engine';
import type { CoinValue, Pence, Stage } from '../engine/types';
import { moneyBoxTotal, purseTotal } from '../state/gameReducer';
import { useGame } from '../state/GameContext';

function heldCoins(coins: readonly CoinValue[]): HeldCoin[] {
  return coins.map((value, index) => ({ index, value }));
}

/** A plain arrow, so the two-way move is obvious without reading anything. */
function UpDownArrows() {
  return (
    <svg viewBox="0 0 40 24" className="h-5 w-8" role="presentation">
      <path
        d="M12 20 L12 8 M12 6 L7 12 M12 6 L17 12 M28 4 L28 16 M28 18 L23 12 M28 18 L33 12"
        stroke="#8a6a3a"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function MoneyBox() {
  const { state, dispatch } = useGame();
  const { save } = state;
  const { stage, savingGoal } = save;

  const boxCoins = useMemo(() => heldCoins(save.moneyBox), [save.moneyBox]);
  const purseCoins = useMemo(() => heldCoins(save.purse), [save.purse]);

  const boxTotal = moneyBoxTotal(save);
  const walletTotal = purseTotal(save);

  const goalItem = savingGoal === null ? undefined : itemById(savingGoal);

  return (
    <div
      data-testid="money-box"
      className="flex h-full min-h-0 flex-col gap-2 rounded-3xl border-4 border-amber-900/25 bg-[#fdf3df] p-3 shadow-lg"
    >
      {/* The box itself */}
      <div className="flex min-h-0 flex-[3] flex-col rounded-2xl border-4 border-amber-800/30 bg-amber-100 p-2">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <span className="text-xl font-black text-amber-900">Money box</span>
          <span className="rounded-full bg-white px-3 py-0.5 text-2xl font-black tabular-nums text-amber-900">
            {formatMoney(boxTotal, stage)}
          </span>
        </div>
        <CoinTray
          coins={boxCoins}
          onTapCoin={(index) => dispatch({ type: 'moveToPurse', index })}
          scale={0.62}
          className="mt-1 min-h-0 flex-1 content-start overflow-y-auto"
          empty={
            <div className="mt-1 flex min-h-0 flex-1 items-center justify-center text-center text-base font-semibold text-amber-900/45">
              Tap a coin below to put it in.
            </div>
          }
        />
      </div>

      {/* Which way the coins go */}
      <div className="flex shrink-0 items-center justify-center gap-2 text-sm font-semibold text-amber-900/60">
        <UpDownArrows />
        <span>Coins go in and out whenever you like.</span>
      </div>

      {/* Her purse */}
      <div className="flex min-h-0 flex-[2] flex-col rounded-2xl border-4 border-amber-800/20 bg-white/70 p-2">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <span className="text-xl font-black text-amber-900">Purse</span>
          <span className="rounded-full bg-amber-100 px-3 py-0.5 text-2xl font-black tabular-nums text-amber-900">
            {formatMoney(walletTotal, stage)}
          </span>
        </div>
        <CoinTray
          coins={purseCoins}
          onTapCoin={(index) => dispatch({ type: 'moveToMoneyBox', index })}
          scale={0.62}
          className="mt-1 min-h-0 flex-1 content-start overflow-y-auto"
          empty={
            <div className="mt-1 flex min-h-0 flex-1 items-center justify-center text-center text-base font-semibold text-amber-900/45">
              No coins in your purse.
            </div>
          }
        />
      </div>

      {goalItem !== undefined && (
        <GoalProgress
          boxTotal={boxTotal}
          price={goalItem.price}
          name={goalItem.name}
          itemId={goalItem.id}
          stage={stage}
        />
      )}
    </div>
  );
}

interface GoalProgressProps {
  boxTotal: Pence;
  price: Pence;
  name: string;
  itemId: string;
  stage: Stage;
}

/**
 * How close the money box is to the thing she is saving for.
 *
 * When it gets there it SAYS SO AND STOPS. It never buys anything for her and
 * never offers to: going to the shop and paying is the whole lesson.
 */
function GoalProgress({ boxTotal, price, name, itemId, stage }: GoalProgressProps) {
  const enough = boxTotal >= price;

  // A percentage of a bar's width, not an amount of money — no money is ever
  // derived by multiplying or dividing.
  const filled = price <= 0 ? 100 : Math.min(100, Math.round((boxTotal * 100) / price));

  return (
    <div
      data-testid="goal-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={price}
      aria-valuenow={Math.min(boxTotal, price)}
      aria-label={`Saving for the ${name}`}
      className={[
        'shrink-0 rounded-2xl border-4 p-2',
        enough ? 'border-emerald-600/40 bg-emerald-50' : 'border-amber-800/20 bg-white/70',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <ItemArt id={itemId} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-amber-900">Saving for: {name}</p>
          <p className="text-lg font-black tabular-nums text-amber-900">
            {formatMoney(boxTotal, stage)} of {formatMoney(price, stage)}
          </p>
        </div>
      </div>
      <div className="mt-1 h-5 w-full overflow-hidden rounded-full border-2 border-amber-900/20 bg-amber-100">
        <div
          className={['h-full rounded-full transition-all', enough ? 'bg-emerald-500' : 'bg-amber-400'].join(' ')}
          style={{ width: `${filled}%` }}
        />
      </div>
      {enough && (
        <p className="mt-1 text-center text-base font-bold text-emerald-800">
          You&rsquo;ve saved enough for the {name.toLowerCase()}!
        </p>
      )}
    </div>
  );
}
