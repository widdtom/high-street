/* =============================================================================
 * THE WEEK SUMMARY
 *
 * A recap, not a report card. NO SCORE, NO RATING, NO STARS, no "well done" and
 * no "you should have". It states what happened in plain numerals — never
 * number words — and offers one button to carry on.
 *
 * If the food meter ended below 3 she says, ONCE, that she felt hungry, with a
 * neutral face. Nothing is deducted, nothing is locked, next week proceeds
 * exactly as normal. See CLAUDE.md, "No fail states".
 * ============================================================================= */

import ItemArt from '../components/ItemArt';
import { FOOD_METER_MAX } from '../data/economy';
import { formatMoney } from '../engine';
import type { Pence, Stage } from '../engine/types';
import { summariseWeek, wentHungry } from '../engine/week';
import { earnedThisWeek, weekStartTotal } from '../state/gameReducer';
import { useGame } from '../state/GameContext';

function Face({ size = 72 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="presentation">
      <circle cx="32" cy="34" r="21" fill="#f4c9a4" />
      <path d="M11 32 Q12 8 32 8 Q52 8 53 32 Q46 22 32 22 Q18 22 11 32 Z" fill="#7a4a24" />
      <circle cx="24" cy="34" r="3" fill="#3a2a18" />
      <circle cx="40" cy="34" r="3" fill="#3a2a18" />
      {/* A straight mouth: neutral. Not a frown, and not a grin either. */}
      <path d="M25 45 L39 45" stroke="#3a2a18" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="40" r="4" fill="#f0a89a" opacity="0.6" />
      <circle cx="46" cy="40" r="4" fill="#f0a89a" opacity="0.6" />
    </svg>
  );
}

function Bulb({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 40 48" width={34} height={40} role="presentation">
      <circle cx="20" cy="18" r="14" fill={on ? '#ffd84d' : '#c9c6bd'} />
      <path d="M15 28 L25 28 L24 38 Q20 41 16 38 Z" fill={on ? '#c9a12c' : '#a9a69d'} />
      <path d="M14 32 L26 32 M14 36 L26 36" stroke="#8d8a82" strokeWidth="2" />
    </svg>
  );
}

/** One filled or empty segment of the food meter. */
function FoodSegment({ filled }: { filled: boolean }) {
  return (
    <span
      className={[
        'h-6 w-10 rounded-md border-2',
        filled ? 'border-amber-800/40 bg-amber-400' : 'border-amber-800/20 bg-amber-100',
      ].join(' ')}
    />
  );
}

interface RowProps {
  label: string;
  value: string;
  children?: React.ReactNode | undefined;
}

function Row({ label, value, children }: RowProps) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-amber-900/10 py-2 last:border-b-0">
      <span className="text-2xl font-semibold text-amber-900/80">{label}</span>
      <span className="ml-auto flex items-center gap-3 text-3xl font-black tabular-nums text-amber-900">
        {children}
        {value}
      </span>
    </div>
  );
}

export default function WeekSummaryScreen() {
  const { state, dispatch } = useGame();
  const { save } = state;
  const stage: Stage = save.stage;

  const startTotal: Pence = weekStartTotal(save);
  const summary = summariseWeek(startTotal, save, earnedThisWeek(save));
  const hungry = wentHungry(summary.foodEaten);

  const goal = save.savingGoal;

  return (
    <div
      data-testid="week-summary"
      className="flex h-full flex-col items-center justify-center bg-[#f6ecd8] p-4"
    >
      <div className="flex w-full max-w-[62rem] flex-col gap-3 rounded-3xl border-4 border-amber-900/25 bg-[#fdf6e8] p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-amber-900">Week {summary.week}</h1>
          <span className="text-2xl font-semibold text-amber-900/60">— what happened</span>
          {goal !== null && (
            <span className="ml-auto flex items-center gap-2 rounded-2xl bg-amber-100 px-3 py-1">
              <ItemArt id={goal} size={36} />
              <span className="text-lg font-bold text-amber-900">Still saving</span>
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <Row label="Money at the start" value={formatMoney(summary.startedWith, stage)} />
          {summary.earned > 0 && (
            <Row label="Money earned at the bakery" value={formatMoney(summary.earned, stage)} />
          )}
          <Row label="Money spent" value={formatMoney(summary.spent, stage)} />
          <Row label="Money left" value={formatMoney(summary.leftWith, stage)} />
          <Row label="Food eaten" value={`${summary.foodEaten} of ${FOOD_METER_MAX}`}>
            <span className="flex items-center gap-1">
              {Array.from({ length: FOOD_METER_MAX }, (_, i) => (
                <FoodSegment key={i} filled={i < summary.foodEaten} />
              ))}
            </span>
          </Row>
          <Row label="Lights" value={summary.lightsStayedOn ? 'On all week' : 'Off'}>
            <Bulb on={summary.lightsStayedOn} />
          </Row>
        </div>

        {/* Said once, calmly, and then dropped. Nothing follows from it. */}
        {hungry && (
          <div className="flex items-center gap-3 rounded-2xl border-4 border-amber-900/15 bg-white px-4 py-3">
            <Face size={64} />
            <p className="text-2xl font-semibold text-amber-900">I felt hungry this week.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => dispatch({ type: 'confirmBed' })}
          className="tappable mt-1 h-20 rounded-3xl border-4 border-emerald-800/30 bg-emerald-500 text-3xl font-black text-white shadow-lg active:scale-95"
        >
          Next week
        </button>
      </div>
    </div>
  );
}
