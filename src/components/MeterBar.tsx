import { FOOD_METER_MAX } from '../data/economy';
import { formatMoney } from '../engine';
import { purseTotal } from '../state/gameReducer';
import { useGame } from '../state/GameContext';

function Bulb({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 32" className="h-7 w-7" role="presentation">
      <path
        d="M12 2 C6.5 2 3 6 3 11 c0 3.4 2 5.6 3.4 7.2 C7.5 19.5 8 20.4 8 21.5 h8 c0-1.1 .5-2 1.6-3.3 C19 16.6 21 14.4 21 11 c0-5-3.5-9-9-9 Z"
        fill={on ? '#ffd84d' : '#cfd4da'}
        stroke={on ? '#c9a227' : '#9aa1a8'}
        strokeWidth="1.5"
      />
      <rect x="8" y="23" width="8" height="2.6" rx="1.3" fill="#9aa1a8" />
      <rect x="8.5" y="26.6" width="7" height="2.6" rx="1.3" fill="#9aa1a8" />
      {on && (
        <g stroke="#ffd84d" strokeWidth="2" strokeLinecap="round">
          <path d="M12 0.5 L12 -1.5" />
        </g>
      )}
    </svg>
  );
}

function Apple({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" role="presentation">
      <circle cx="9" cy="14" r="7" fill={filled ? '#d64545' : '#00000018'} />
      <circle cx="15" cy="14" r="7" fill={filled ? '#e05a5a' : '#00000012'} />
      <path d="M12 6 L12 3" stroke={filled ? '#6b4423' : '#00000020'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The always-there strip. Both meters live here so she can see them from any
 * screen, alongside the week and what is in her purse.
 *
 * Neither meter is a score and neither can be failed. They are information.
 */
export default function MeterBar() {
  const { state, dispatch } = useGame();
  const { save } = state;
  const lightsOn = save.electricityDays > 0;

  return (
    <div className="flex shrink-0 items-center gap-3 border-b-2 border-amber-900/20 bg-amber-50 px-3 py-1">
      <span className="rounded-full bg-amber-900/10 px-3 py-0.5 text-base font-bold tabular-nums text-amber-900">
        Week {save.week}
      </span>

      {/* Food */}
      <div
        className="flex items-center gap-1"
        aria-label={`Food ${save.foodMeter} of ${FOOD_METER_MAX}`}
        data-testid="food-meter"
        data-value={save.foodMeter}
      >
        {Array.from({ length: FOOD_METER_MAX }, (_, i) => (
          <Apple key={i} filled={i < save.foodMeter} />
        ))}
      </div>

      {/* Electricity */}
      <div
        className="flex items-center"
        aria-label={lightsOn ? 'Lights on' : 'Lights off'}
        data-testid="electricity-meter"
        data-value={save.electricityDays}
      >
        <Bulb on={lightsOn} />
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'go', screen: 'purse' })}
        aria-label="Purse"
        data-testid="purse-button"
        className="tappable ml-auto rounded-full border-2 border-amber-900/25 bg-amber-100 px-4 py-0.5 text-xl font-black tabular-nums text-amber-900 active:scale-95"
      >
        {formatMoney(purseTotal(save), save.stage)}
      </button>

      <button
        type="button"
        onClick={() => dispatch({ type: 'go', screen: 'bedroom' })}
        aria-label="Bedroom"
        className="tappable rounded-full border-2 border-amber-900/25 bg-amber-100 p-1 active:scale-95"
      >
        <svg viewBox="0 0 32 24" className="h-6 w-8" role="presentation">
          <path d="M2 14 L16 3 L30 14" stroke="#7c4a1e" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <rect x="6" y="14" width="20" height="8" rx="1.5" fill="#c8924f" />
          <rect x="13" y="17" width="6" height="5" fill="#7c4a1e" />
        </svg>
      </button>
    </div>
  );
}
