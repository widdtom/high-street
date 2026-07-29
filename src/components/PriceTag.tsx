import { formatMoney } from '../engine';
import type { Pence, Stage } from '../engine/types';

interface PriceTagProps {
  price: Pence;
  stage: Stage;
  /** Slightly larger tag for the item she is currently buying. */
  large?: boolean;
}

/**
 * A little swing-ticket price label. Numerals only — never number words.
 * Stages 1-3 show pence ("12p"); stage 4 shows pounds above 100p.
 */
export default function PriceTag({ price, stage, large = false }: PriceTagProps) {
  return (
    <span
      className={[
        'inline-flex select-none items-center rounded-md border-2 border-amber-800/40',
        'bg-amber-50 font-bold tabular-nums text-amber-900 shadow-sm',
        large ? 'px-4 py-1.5 text-3xl' : 'px-2.5 py-0.5 text-xl',
      ].join(' ')}
    >
      {formatMoney(price, stage)}
    </span>
  );
}
