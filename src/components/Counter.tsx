import type { Pence, Stage } from '../engine/types';
import ItemArt from './ItemArt';
import PriceTag from './PriceTag';

export interface CounterItem {
  readonly id: string;
  readonly name: string;
  readonly price: Pence;
}

interface CounterProps {
  items: readonly CounterItem[];
  stage: Stage;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The shop counter: items laid out on the shelf, each with its price ticket.
 * Tap to choose. No instructions — the shelf explains itself.
 */
export default function Counter({ items, stage, selectedId, onSelect }: CounterProps) {
  return (
    <ul className="flex items-center justify-center gap-2 sm:gap-4">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id} className="flex">
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${item.name}`}
              onClick={() => onSelect(item.id)}
              className={[
                'tappable flex w-[10rem] flex-col items-center justify-center gap-2 rounded-2xl border-4 px-2 py-3 transition',
                'bg-white/85 active:scale-95',
                selected
                  ? 'border-emerald-500 shadow-lg shadow-emerald-600/30 -translate-y-1'
                  : 'border-amber-900/15 shadow',
              ].join(' ')}
            >
              <ItemArt id={item.id} size={118} />
              <PriceTag price={item.price} stage={stage} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
