import { useMemo } from 'react';
import CoinSVG from '../components/coins/CoinSVG';
import { formatMoney } from '../engine';
import type { CoinValue } from '../engine/types';
import { useGame } from '../state/GameContext';

/**
 * Her coins laid out and grouped by denomination, with the total.
 * Nothing is interactive here except closing it — this is a place to look.
 */
export default function PurseScreen() {
  const { state, dispatch } = useGame();
  const { purse, stage } = state.save;

  const groups = useMemo(() => {
    const counts = new Map<CoinValue, number>();
    for (const coin of purse) counts.set(coin, (counts.get(coin) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  }, [purse]);

  const total = purse.reduce<number>((sum, coin) => sum + coin, 0);

  return (
    <div className="flex h-full flex-col bg-[#f6ead6]">
      <div className="flex shrink-0 items-center gap-3 border-b-4 border-amber-900/15 bg-amber-800 px-3 py-1.5 text-white">
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: state.previousScreen })}
          aria-label="Close purse"
          className="tappable rounded-full bg-white/25 p-1 active:scale-90"
        >
          <svg viewBox="0 0 32 32" className="h-8 w-8" role="presentation">
            <path
              d="M9 9 L23 23 M23 9 L9 23"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-black tracking-wide">Purse</h1>
        <span className="ml-auto rounded-full bg-white/25 px-4 py-1 text-2xl font-black tabular-nums">
          {formatMoney(total, stage)}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {groups.length === 0 ? (
          <p className="mt-8 text-center text-2xl text-amber-900/50">Your purse is empty.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groups.map(([value, count]) => (
              <li
                key={value}
                className="flex items-center gap-3 rounded-2xl border-2 border-amber-900/10 bg-white/70 px-3 py-2"
              >
                <span className="w-24 shrink-0 text-right text-2xl font-black tabular-nums text-amber-900">
                  {formatMoney(value * count, stage)}
                </span>
                <ul className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: count }, (_, i) => (
                    <li key={i}>
                      <CoinSVG value={value} scale={0.72} seed={value * 31 + i} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
