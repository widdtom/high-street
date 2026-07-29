import type { ReactNode } from 'react';
import type { Pence, Stage } from '../engine/types';
import ItemArt from './ItemArt';
import PriceTag from './PriceTag';

export interface CounterItem {
  readonly id: string;
  readonly name: string;
  readonly price: Pence;
}

interface CounterProps<T extends CounterItem> {
  items: readonly T[];
  stage: Stage;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Card width in px. Five bakery items fit a single row at 160. */
  cardWidth?: number | undefined;
  /** Side of the square the item's picture is drawn in. */
  artSize?: number | undefined;
  /**
   * Widest row, in cards. Nine items at 5 wrap to a deliberate 5 + 4 instead
   * of however many happen to fit.
   */
  columns?: number | undefined;
  /** Replaces the default price ticket. The charity shop shows two prices. */
  renderPrice?: ((item: T) => ReactNode) | undefined;
  /**
   * Rendered on top of the card, outside its button, so it has its own hit
   * area. Used for the toy shop's saving-goal star — nested buttons are not
   * legal HTML, so it is a sibling stacked above the card.
   */
  renderCorner?: ((item: T) => ReactNode) | undefined;
  /** Visible and priced, but not purchasable yet. Never hidden. */
  isLocked?: ((item: T) => boolean) | undefined;
  /** Put on every card button, for the live verification script. */
  itemTestId?: string | undefined;
}

function Padlock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" role="presentation">
      <path
        d="M7 11 V8 a5 5 0 0 1 10 0 v3"
        stroke="#78716c"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="#a8a29e" />
      <circle cx="12" cy="16" r="1.8" fill="#57534e" />
    </svg>
  );
}

/**
 * The shop counter: items laid out on the shelf, each with its price ticket.
 * Tap to choose. No instructions — the shelf explains itself.
 *
 * Wraps onto a second row when a shop has more items than fit across, rather
 * than shrinking the cards below a comfortable tap target.
 */
export default function Counter<T extends CounterItem>({
  items,
  stage,
  selectedId,
  onSelect,
  cardWidth = 160,
  artSize = 118,
  columns,
  renderPrice,
  renderCorner,
  isLocked,
  itemTestId,
}: CounterProps<T>) {
  return (
    <ul
      className="flex max-w-full flex-wrap content-center items-stretch justify-center gap-2 sm:gap-3"
      style={columns === undefined ? undefined : { maxWidth: columns * (cardWidth + 12) }}
    >
      {items.map((item) => {
        const selected = item.id === selectedId;
        const locked = isLocked !== undefined && isLocked(item);
        return (
          <li key={item.id} className="relative flex">
            <button
              type="button"
              aria-pressed={selected}
              aria-label={item.name}
              disabled={locked}
              data-testid={itemTestId}
              data-item-id={item.id}
              onClick={() => onSelect(item.id)}
              style={{ width: cardWidth }}
              className={[
                'tappable flex flex-col items-center justify-center gap-2 rounded-2xl border-4 px-2 py-2 transition',
                locked ? 'bg-white/55' : 'bg-white/85 active:scale-95',
                selected
                  ? 'border-emerald-500 shadow-lg shadow-emerald-600/30 -translate-y-1'
                  : 'border-amber-900/15 shadow',
              ].join(' ')}
            >
              <span
                className={['flex items-center justify-center', locked ? 'opacity-40' : ''].join(' ')}
                style={{ width: artSize, height: artSize }}
              >
                <ItemArt id={item.id} size={artSize} />
              </span>
              {renderPrice === undefined ? (
                <PriceTag price={item.price} stage={stage} />
              ) : (
                renderPrice(item)
              )}
            </button>

            {locked && (
              <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 p-1 shadow">
                <Padlock />
              </span>
            )}

            {renderCorner !== undefined && renderCorner(item)}
          </li>
        );
      })}
    </ul>
  );
}
