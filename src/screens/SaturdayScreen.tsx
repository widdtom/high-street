import { useEffect, useState } from 'react';
import CoinSVG from '../components/coins/CoinSVG';
import { ELECTRICITY_WEEKLY, FOOD_METER_MAX } from '../data/economy';
import { formatMoney } from '../engine';
import { incomeCoins, weeklyIncome } from '../state/gameReducer';
import type { CoinValue } from '../engine/types';
import { useGame } from '../state/GameContext';

/**
 * Saturday morning. A short sequence of taps, not a cutscene — she is doing
 * something at every beat, and nothing happens without her.
 */
export default function SaturdayScreen() {
  const { state, dispatch } = useGame();
  const { stage } = state.save;

  // Exactly the coins the reducer added to her purse when the week turned.
  const coins: CoinValue[] = incomeCoins(stage);
  const total = weeklyIncome();

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-sky-200 to-amber-50 p-6">
      {state.saturdayStep === 0 && <CoinDrop coins={coins} total={total} />}
      {state.saturdayStep === 1 && (
        <Beat
          title="The electricity has run out"
          onNext={() => dispatch({ type: 'saturdayNext' })}
        >
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 24 32" className="h-24 w-24" role="presentation">
              <path
                d="M12 2 C6.5 2 3 6 3 11 c0 3.4 2 5.6 3.4 7.2 C7.5 19.5 8 20.4 8 21.5 h8 c0-1.1 .5-2 1.6-3.3 C19 16.6 21 14.4 21 11 c0-5-3.5-9-9-9 Z"
                fill="#cfd4da"
                stroke="#9aa1a8"
                strokeWidth="1.5"
              />
              <rect x="8" y="23" width="8" height="2.6" rx="1.3" fill="#9aa1a8" />
              <rect x="8.5" y="26.6" width="7" height="2.6" rx="1.3" fill="#9aa1a8" />
            </svg>
            <div className="rounded-2xl border-4 border-amber-900/20 bg-white px-8 py-5 text-center shadow">
              <p className="text-lg font-semibold text-stone-600">A top-up costs</p>
              <p className="text-6xl font-black tabular-nums text-amber-900">
                {formatMoney(ELECTRICITY_WEEKLY, stage)}
              </p>
            </div>
          </div>
        </Beat>
      )}
      {state.saturdayStep === 2 && (
        <Beat title="The cupboard is empty" onNext={() => dispatch({ type: 'saturdayNext' })}>
          <div className="flex items-center gap-3">
            {Array.from({ length: FOOD_METER_MAX }, (_, i) => (
              <div
                key={i}
                className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-dashed border-amber-900/25 bg-white/60"
              >
                <span className="text-4xl opacity-20" aria-hidden="true">
                  ?
                </span>
              </div>
            ))}
          </div>
        </Beat>
      )}
    </div>
  );
}

function Beat({
  title,
  children,
  onNext,
}: {
  title: string;
  children: React.ReactNode;
  onNext: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNext}
      className="tappable flex flex-col items-center gap-6 rounded-3xl px-10 py-8 active:scale-[0.99]"
    >
      <h1 className="text-4xl font-black text-amber-900">{title}</h1>
      {children}
      <span className="rounded-full bg-emerald-500 px-8 py-2 text-2xl font-black text-white shadow-lg">
        Next
      </span>
    </button>
  );
}

/**
 * Beat one: this week's coins, which she taps to take.
 *
 * Presentational only. The money is already in her purse — it was granted with
 * the week counter when she went to bed, so a reload can never pay her twice.
 * The meter bar is hidden on this screen, so she doesn't see the total until
 * the coins have visibly landed.
 */
function CoinDrop({ coins, total }: { coins: CoinValue[]; total: number }) {
  const { state, dispatch } = useGame();
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    if (!taken) return undefined;
    const t = setTimeout(() => dispatch({ type: 'saturdayNext' }), 850);
    return () => clearTimeout(t);
  }, [taken, dispatch]);

  const take = () => setTaken(true);

  return (
    <button
      type="button"
      onClick={take}
      aria-label="Take your money"
      data-testid="collect-coins"
      className="tappable flex flex-col items-center gap-6 active:scale-[0.99]"
    >
      <h1 className="text-4xl font-black text-amber-900">Saturday</h1>
      <p className="text-2xl font-semibold text-amber-800">
        Your money this week: {formatMoney(total, state.save.stage)}
      </p>

      <ul className="flex flex-wrap items-center justify-center gap-3">
        {coins.map((coin, i) => (
          <li
            key={`${coin}-${i}`}
            // CSS transitions only — no animation library. The coins slide up
            // and fade toward the purse in the bar above.
            className="transition-all duration-700 ease-in"
            style={
              taken
                ? { transform: 'translateY(-220px) scale(0.35)', opacity: 0 }
                : { transform: 'none', opacity: 1, transitionDelay: `${i * 60}ms` }
            }
          >
            <CoinSVG value={coin} seed={i} />
          </li>
        ))}
      </ul>

      {!taken && (
        <span className="rounded-full bg-emerald-500 px-8 py-2 text-2xl font-black text-white shadow-lg">
          Take it
        </span>
      )}
    </button>
  );
}
