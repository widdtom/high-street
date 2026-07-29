import type { CoinValue } from '../engine/types';
import CoinSVG, { COIN_LABEL } from './coins/CoinSVG';

/** One coin she is actually holding, identified by its slot in the purse. */
export interface HeldCoin {
  index: number;
  value: CoinValue;
}

interface CoinTrayProps {
  coins: readonly HeldCoin[];
  /**
   * Tap handler. Tapping a coin in the tray moves it to the payment area;
   * tapping it in the payment area sends it back. Taps only — HTML5
   * drag-and-drop does not work in iOS Safari and drag gestures are
   * unreliable for a six-year-old.
   */
  onTapCoin: (index: number) => void;
  scale?: number;
  /** Rendered when there is nothing to show. */
  empty?: React.ReactNode;
  className?: string;
}

export default function CoinTray({
  coins,
  onTapCoin,
  scale = 1,
  empty,
  className,
}: CoinTrayProps) {
  if (coins.length === 0 && empty !== undefined) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <ul className={['flex flex-wrap items-center gap-1.5', className ?? ''].join(' ')}>
      {coins.map((coin) => (
        <li key={coin.index} className="flex">
          <button
            type="button"
            aria-label={COIN_LABEL[coin.value]}
            onClick={() => onTapCoin(coin.index)}
            className="tappable rounded-full transition active:scale-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-emerald-500"
          >
            <CoinSVG value={coin.value} scale={scale} seed={coin.index} />
          </button>
        </li>
      ))}
    </ul>
  );
}
