import type { Topping, ToppingCounts } from '../engine/shift';

/** A glacé cherry or a chocolate button, drawn at (x, y) in a 100-unit box. */
export function ToppingShape({ kind, x, y, r = 5 }: { kind: Topping; x: number; y: number; r?: number }) {
  if (kind === 'cherry') {
    return (
      <g>
        <path
          d={`M${x} ${y - r} Q${x + r * 0.4} ${y - r * 2.2} ${x + r * 1.1} ${y - r * 2.4}`}
          stroke="#4a7a2a"
          strokeWidth={r * 0.35}
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={x} cy={y} r={r} fill="#d6283c" />
        <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#ffffff" opacity="0.6" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#6b3a1e" />
      <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke="#8a5230" strokeWidth={r * 0.25} />
    </g>
  );
}

/** One topping on its own, as a little picture. */
export function ToppingIcon({ kind, size = 28 }: { kind: Topping; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="presentation">
      <ToppingShape kind={kind} x={11} y={14} r={7} />
    </svg>
  );
}

export const TOPPING_NAME: Record<Topping, { one: string; many: string }> = {
  cherry: { one: 'cherry', many: 'cherries' },
  button: { one: 'chocolate button', many: 'chocolate buttons' },
};

/**
 * Spots on the icing. Fixed, not random, so the same count always looks the
 * same — and spread out so a six-year-old can count them by pointing.
 */
const SPOTS: ReadonlyArray<readonly [number, number]> = [
  [36, 46], [50, 41], [64, 46], [43, 54], [57, 54], [29, 54],
  [71, 54], [50, 48], [36, 60], [64, 60], [50, 61], [78, 49],
];

/**
 * The iced bun on her tray, big, with whatever she has put on it. Tapping a
 * topping takes that one off again.
 */
export function BunWithToppings({
  toppings,
  size,
  onRemove,
}: {
  toppings: ToppingCounts;
  size: number;
  onRemove?: ((kind: Topping) => void) | undefined;
}) {
  const placed: Topping[] = [
    ...Array.from({ length: toppings.cherry }, () => 'cherry' as const),
    ...Array.from({ length: toppings.button }, () => 'button' as const),
  ];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation" data-testid="bun">
      <ellipse cx="50" cy="66" rx="40" ry="26" fill="#dea45f" />
      <path d="M11 62 Q16 30 50 30 Q84 30 89 62 Q70 54 50 58 Q30 62 11 62 Z" fill="#f6c9dd" />
      {placed.map((kind, i) => {
        const spot = SPOTS[i % SPOTS.length] ?? [50, 50];
        return (
          <g
            key={`${kind}-${i}`}
            onClick={onRemove === undefined ? undefined : () => onRemove(kind)}
            style={onRemove === undefined ? undefined : { cursor: 'pointer' }}
            data-testid="bun-topping"
            data-kind={kind}
          >
            {/* A larger invisible target than the topping itself. */}
            <circle cx={spot[0]} cy={spot[1]} r="7" fill="transparent" />
            <ToppingShape kind={kind} x={spot[0]} y={spot[1]} r={4.6} />
          </g>
        );
      })}
    </svg>
  );
}
