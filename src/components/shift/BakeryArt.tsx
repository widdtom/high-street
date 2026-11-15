/**
 * Inline SVG for the bakery jobs. Same house style as ItemArt: flat, warm,
 * readable at a glance. No images, no icon library, no emoji as artwork.
 */

import type { Filling, Fruit } from '../../engine/tasks';

export function RollingPin({ size = 220 }: { size?: number }) {
  return (
    <svg viewBox="0 0 220 44" width={size} height={(size * 44) / 220} role="presentation">
      <rect x="0" y="16" width="34" height="12" rx="6" fill="#9c6329" />
      <rect x="186" y="16" width="34" height="12" rx="6" fill="#9c6329" />
      <rect x="30" y="4" width="160" height="36" rx="18" fill="#e3b77a" />
      <rect x="30" y="8" width="160" height="10" rx="5" fill="#f2d3a5" />
    </svg>
  );
}

/** The dough. `flat` goes from 0 (a ball) to 1 (rolled out). */
export function Dough({ flat, width = 420 }: { flat: number; width?: number }) {
  const f = Math.max(0, Math.min(1, flat));
  const rx = 70 + f * 130;
  const ry = 52 - f * 32;
  return (
    <svg viewBox="0 0 420 140" width={width} height={(width * 140) / 420} role="presentation" data-testid="dough">
      <ellipse cx="210" cy="118" rx={rx + 10} ry="10" fill="#00000014" />
      <ellipse
        cx="210"
        cy={118 - ry}
        rx={rx}
        ry={ry}
        fill="#f3dfbf"
        stroke="#e2c79c"
        strokeWidth="3"
        style={{ transition: 'all 450ms ease-out' }}
      />
      <ellipse
        cx={200}
        cy={118 - ry * 1.5}
        rx={rx * 0.5}
        ry={ry * 0.25}
        fill="#fff6e6"
        style={{ transition: 'all 450ms ease-out' }}
      />
    </svg>
  );
}

export function Doughnut({ filling, size = 96 }: { filling: Filling | null; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <ellipse cx="50" cy="60" rx="40" ry="30" fill="#d9954a" />
      <ellipse cx="50" cy="54" rx="36" ry="24" fill="#e8ad62" />
      {[
        [30, 50],
        [44, 42],
        [62, 46],
        [70, 58],
        [36, 64],
        [56, 66],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#fff5dc" />
      ))}
      {filling === 'jam' && (
        <path d="M38 42 Q50 22 62 42 Q62 56 50 56 Q38 56 38 42 Z" fill="#c8102e" stroke="#8f0b20" strokeWidth="2" />
      )}
      {filling === 'cream' && (
        <path d="M36 44 Q40 26 50 30 Q60 22 64 44 Q60 56 50 54 Q40 56 36 44 Z" fill="#ffffff" stroke="#e6e0d0" strokeWidth="2" />
      )}
    </svg>
  );
}

export function PipingBag({ filling, size = 64 }: { filling: Filling; size?: number }) {
  const colour = filling === 'jam' ? '#c8102e' : '#ffffff';
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="presentation">
      <path d="M10 8 L54 8 L36 52 L28 52 Z" fill="#e9e4f2" stroke="#b8b0c8" strokeWidth="2" />
      <path d="M14 18 L50 18 L36 50 L28 50 Z" fill={colour} stroke={filling === 'cream' ? '#ddd6c6' : 'none'} />
      <rect x="28" y="50" width="8" height="8" rx="2" fill="#9aa1a8" />
    </svg>
  );
}

export function FruitShape({ fruit, x, y, r }: { fruit: Fruit; x: number; y: number; r: number }) {
  switch (fruit) {
    case 'strawberry':
      return (
        <g>
          <path
            d={`M${x - r} ${y - r * 0.4} Q${x} ${y - r * 1.1} ${x + r} ${y - r * 0.4} Q${x + r * 0.8} ${y + r * 0.6} ${x} ${y + r * 1.1} Q${x - r * 0.8} ${y + r * 0.6} ${x - r} ${y - r * 0.4} Z`}
            fill="#e0313b"
          />
          <path
            d={`M${x - r * 0.6} ${y - r * 0.7} L${x} ${y - r * 0.35} L${x + r * 0.6} ${y - r * 0.7} L${x} ${y - r * 1.05} Z`}
            fill="#3c9a3c"
          />
          {[
            [-0.4, 0],
            [0.3, -0.05],
            [-0.1, 0.45],
            [0.35, 0.4],
          ].map(([dx, dy]) => (
            <circle key={`${dx}-${dy}`} cx={x + (dx ?? 0) * r} cy={y + (dy ?? 0) * r} r={r * 0.08} fill="#ffd98a" />
          ))}
        </g>
      );
    case 'blueberry':
      return (
        <g>
          <circle cx={x} cy={y} r={r * 0.85} fill="#3d4fa8" />
          <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.22} fill="#8a98d8" opacity="0.7" />
          <path
            d={`M${x - r * 0.25} ${y - r * 0.85} L${x} ${y - r * 0.6} L${x + r * 0.25} ${y - r * 0.85}`}
            stroke="#1f2a66"
            strokeWidth={r * 0.12}
            fill="none"
          />
        </g>
      );
    case 'kiwi':
      return (
        <g>
          <circle cx={x} cy={y} r={r * 0.95} fill="#7a5a32" />
          <circle cx={x} cy={y} r={r * 0.82} fill="#8cc63f" />
          <circle cx={x} cy={y} r={r * 0.28} fill="#f3f7d6" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={x + Math.cos(a) * r * 0.5} cy={y + Math.sin(a) * r * 0.5} r={r * 0.07} fill="#222" />;
          })}
        </g>
      );
  }
}

export function FruitIcon({ fruit, size = 48 }: { fruit: Fruit; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="presentation">
      <FruitShape fruit={fruit} x={20} y={21} r={15} />
    </svg>
  );
}

export function CrumbPile({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 40" width={size} height={(size * 40) / 64} role="presentation">
      <ellipse cx="32" cy="32" rx="26" ry="7" fill="#00000012" />
      {[
        [14, 28, 5],
        [24, 24, 6],
        [36, 22, 7],
        [46, 27, 5],
        [30, 30, 5],
        [20, 32, 4],
        [42, 32, 4],
        [52, 31, 3],
        [10, 33, 3],
      ].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={(x ?? 0) % 3 === 0 ? '#7a4a24' : '#b8743a'} stroke="#5e3818" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

export function Broom({ size = 90 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 90" width={(size * 60) / 90} height={size} role="presentation">
      <rect x="27" y="2" width="6" height="52" rx="3" fill="#9c6329" />
      <path d="M14 54 H46 L54 86 H6 Z" fill="#e3b341" />
      <path d="M14 54 H46 L47 60 H13 Z" fill="#c0392b" />
      {[14, 22, 30, 38, 46].map((x) => (
        <path key={x} d={`M${x} 62 L${x - 2} 84`} stroke="#c9962a" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function Dustpan({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 70" width={size} height={(size * 70) / 120} role="presentation">
      <path d="M8 20 H96 L104 64 H16 Z" fill="#4a90d9" />
      <path d="M8 20 H96 L98 28 H10 Z" fill="#3a78b8" />
      <rect x="96" y="30" width="22" height="10" rx="5" fill="#3a78b8" />
    </svg>
  );
}
