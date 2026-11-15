import { hasWorkedThisWeek } from '../engine/shift';
import type { Screen } from '../state/gameReducer';
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
  { id: 'greengrocer', name: 'Greengrocer', open: true, awning: '#6aa84f', wall: '#f3f7ee', art: Apple },
  { id: 'toyshop', name: 'Toy shop', open: true, awning: '#4a90d9', wall: '#eef4fb', art: Bear },
  { id: 'charity', name: 'Charity shop', open: true, awning: '#9b6bb5', wall: '#f6f0fa', art: Heart },
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

/**
 * The "Help wanted" card in the bakery window. A sibling of the shopfront
 * button, stacked on top of it — nested buttons are not legal HTML. Once this
 * week's shift is done it turns over to say so, and stays tappable: the bakery
 * thanks her and says come back next week.
 */
function HelpWanted({ worked, onTap }: { worked: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={worked ? 'Help wanted: done this week' : 'Help wanted'}
      data-testid="help-wanted"
      data-worked={worked}
      className={[
        'tappable absolute left-1/2 top-[4.2rem] z-10 flex -translate-x-1/2 -rotate-3 flex-col items-center rounded-xl border-4 px-3 py-1 shadow-lg transition active:scale-95 sm:top-[4.7rem]',
        worked ? 'border-stone-300 bg-stone-100 text-stone-500' : 'border-amber-800/40 bg-amber-50 text-amber-900',
      ].join(' ')}
    >
      {/* An apron, so the sign reads without words. */}
      <svg viewBox="0 0 32 32" className="h-8 w-8" role="presentation">
        <path d="M11 3 Q16 7 21 3" stroke={worked ? '#a8a29e' : '#e07a5f'} strokeWidth="2.5" fill="none" />
        <path d="M10 6 H22 V12 L27 12 L25 29 H7 L5 12 L10 12 Z" fill={worked ? '#d6d3d1' : '#e07a5f'} />
        <rect x="11" y="17" width="10" height="6" rx="1.5" fill="#ffffff" opacity="0.6" />
      </svg>
      <span className="whitespace-nowrap text-base font-black leading-tight">
        {worked ? 'See you next week' : 'Help wanted!'}
      </span>
    </button>
  );
}

/**
 * The high street. All four shops are open. No text instructions — the shops
 * are visually obvious, and the awning colour is the only thing that names them.
 */
export default function StreetScreen() {
  const { state, dispatch } = useGame();
  const worked = hasWorkedThisWeek(state.save.shiftWeek, state.save.week);

  return (
    <div className="flex h-full flex-col">
      {/* Sky */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-end bg-gradient-to-b from-sky-300 to-sky-100 px-3 pt-3">
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'parent' })}
          aria-label="Grown-ups"
          className="tappable absolute left-3 top-2 z-10 rounded-full border-2 border-stone-400/50 bg-white/60 px-3 py-0.5 text-xs font-semibold text-stone-500 opacity-70 active:scale-95"
        >
          Grown-ups
        </button>

        <div className="flex h-[80%] min-h-0 items-end gap-3 sm:gap-4">
          {SHOPS.map((shop) => (
            <div key={shop.id} className="relative flex h-full flex-1">
              <Shopfront
                shop={shop}
                onEnter={() => dispatch({ type: 'go', screen: shop.id as Screen })}
              />
              {shop.id === 'bakery' && (
                <HelpWanted worked={worked} onTap={() => dispatch({ type: 'go', screen: 'shift' })} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pavement */}
      <div className="h-10 shrink-0 bg-stone-300 shadow-inner" />
    </div>
  );
}
