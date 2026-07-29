import { useGame } from '../state/GameContext';

interface Shop {
  id: string;
  name: string;
  open: boolean;
  awning: string;
  wall: string;
  art: JSX.Element;
}

const Bread = (
  <g>
    <path d="M14 60 L14 40 Q14 26 40 26 Q66 26 66 40 L66 60 Z" fill="#c98b4b" />
    <path d="M14 42 Q14 28 40 28 Q66 28 66 42 Q52 35 40 35 Q28 35 14 42 Z" fill="#e6b072" />
  </g>
);

const Apple = (
  <g>
    <circle cx="30" cy="46" r="16" fill="#d64545" />
    <circle cx="48" cy="46" r="16" fill="#e05a5a" />
    <path d="M39 30 L39 22" stroke="#6b4423" strokeWidth="4" strokeLinecap="round" />
    <path d="M39 24 Q50 18 52 26 Q44 30 39 26 Z" fill="#5aa04a" />
  </g>
);

const Bear = (
  <g>
    <circle cx="26" cy="30" r="8" fill="#b58043" />
    <circle cx="54" cy="30" r="8" fill="#b58043" />
    <circle cx="40" cy="44" r="20" fill="#c8924f" />
    <circle cx="33" cy="40" r="3" fill="#3b2a18" />
    <circle cx="47" cy="40" r="3" fill="#3b2a18" />
    <ellipse cx="40" cy="50" rx="7" ry="5" fill="#e8cfa8" />
    <circle cx="40" cy="48" r="2.5" fill="#3b2a18" />
  </g>
);

const Heart = (
  <path
    d="M40 62 C10 42 16 22 30 22 C37 22 40 28 40 28 C40 28 43 22 50 22 C64 22 70 42 40 62 Z"
    fill="#d1477a"
  />
);

const SHOPS: Shop[] = [
  { id: 'bakery', name: 'Bakery', open: true, awning: '#e07a5f', wall: '#fbf3e4', art: Bread },
  { id: 'greengrocer', name: 'Greengrocer', open: false, awning: '#6aa84f', wall: '#f1efe6', art: Apple },
  { id: 'toyshop', name: 'Toy shop', open: false, awning: '#4a90d9', wall: '#f1efe6', art: Bear },
  { id: 'charity', name: 'Charity shop', open: false, awning: '#9b6bb5', wall: '#f1efe6', art: Heart },
];

function Shopfront({ shop, onEnter }: { shop: Shop; onEnter: () => void }) {
  return (
    <button
      type="button"
      disabled={!shop.open}
      onClick={onEnter}
      aria-label={shop.open ? shop.name : `${shop.name}, closed`}
      className={[
        'tappable relative flex h-full flex-1 flex-col overflow-hidden rounded-t-2xl border-4 border-b-0 border-amber-900/25 transition',
        shop.open
          ? 'shadow-xl active:scale-[0.98] active:translate-y-0.5'
          : 'grayscale opacity-60 cursor-default',
      ].join(' ')}
      style={{ backgroundColor: shop.wall }}
    >
      {/* Awning */}
      <div className="h-12 w-full shrink-0 sm:h-14" style={{ backgroundColor: shop.awning }}>
        <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="h-full w-full">
          <path
            d="M0 0 H120 V6 Q114 12 108 6 Q102 12 96 6 Q90 12 84 6 Q78 12 72 6 Q66 12 60 6 Q54 12 48 6 Q42 12 36 6 Q30 12 24 6 Q18 12 12 6 Q6 12 0 6 Z"
            fill="rgba(255,255,255,0.28)"
          />
        </svg>
      </div>

      {/* Window with the shop's sign */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-3">
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-sky-50/70 p-3 shadow-inner">
          <svg
            viewBox="0 0 80 80"
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            role="presentation"
          >
            {shop.art}
          </svg>
        </div>
      </div>

      {/* Door */}
      <div className="mx-auto h-20 w-[36%] shrink-0 rounded-t-lg bg-amber-900/70 shadow-inner" />

      {!shop.open && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-lg border-4 border-stone-700 bg-stone-100 px-4 py-1.5 text-2xl font-black tracking-wide text-stone-700 shadow-lg">
          CLOSED
        </span>
      )}
    </button>
  );
}

function PurseIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" role="presentation">
      <path d="M6 18 H42 A4 4 0 0 1 46 22 V38 A4 4 0 0 1 42 42 H6 A4 4 0 0 1 2 38 V22 A4 4 0 0 1 6 18 Z" fill="#a0522d" />
      <path d="M12 18 Q12 6 24 6 Q36 6 36 18" stroke="#8b4513" strokeWidth="4" fill="none" />
      <circle cx="38" cy="30" r="5" fill="#d4af37" />
    </svg>
  );
}

/**
 * The high street. Only the bakery is open; the rest are drawn but shut.
 * No text instructions — the shops are visually obvious.
 */
export default function StreetScreen() {
  const { dispatch } = useGame();

  return (
    <div className="flex h-full flex-col">
      {/* Sky */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-end bg-gradient-to-b from-sky-300 to-sky-100 px-3 pt-3">
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'purse' })}
          aria-label="Purse"
          className="tappable absolute right-3 top-3 z-10 rounded-full border-4 border-amber-900/30 bg-amber-100 p-1.5 shadow-lg active:scale-90"
        >
          <PurseIcon />
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'parent' })}
          aria-label="Grown-ups"
          className="tappable absolute left-3 top-3 z-10 rounded-full border-2 border-stone-400/50 bg-white/60 px-3 py-1 text-xs font-semibold text-stone-500 opacity-70 active:scale-95"
        >
          Grown-ups
        </button>

        <div className="flex h-[74%] min-h-0 items-end gap-3 sm:gap-4">
          {SHOPS.map((shop) => (
            <Shopfront
              key={shop.id}
              shop={shop}
              onEnter={() => shop.open && dispatch({ type: 'go', screen: 'bakery' })}
            />
          ))}
        </div>
      </div>

      {/* Pavement */}
      <div className="h-10 shrink-0 bg-stone-300 shadow-inner" />
    </div>
  );
}
