/* =============================================================================
 * CoinSVG — the one coin renderer.
 *
 * Two rules govern this file:
 *
 * 1. SIZE IS SACRED. Every coin renders at its true millimetre width scaled by
 *    3.2 px/mm. A 5p (18.0 mm -> 57.6 px) really is the smallest coin in the
 *    set, smaller than the 1p and far smaller than the 2p. That mismatch
 *    between size and value is the thing the game exists to teach, so the size
 *    is pinned with explicit width/height attributes AND an inline style, and
 *    the viewBox is the coin's own mm-derived square so nothing rescales.
 *
 * 2. PURITY. CoinSVG is a pure function of its props: no state, no effects, no
 *    Math.random(). When `monarch` is omitted it is derived from a stable hash
 *    of (value, seed) — see monarchFor(). React can re-render a coin many times
 *    per second; genuine per-render randomness would make the portraits flicker.
 * ============================================================================= */

import type { CoinValue, Monarch } from '../../engine/types';
import {
  COIN_GEOMETRY,
  COIN_LABEL,
  circlePath,
  coinDiameterPx,
  coinEdgePath,
  innerDiscFraction,
  isBimetallic,
  millingPath,
} from './geometry';
import { MonarchPortrait, PORTRAIT_BOX } from './monarchs';

export { coinDiameterPx, COIN_LABEL };

/** Never fetched — a plain system stack, so the game works fully offline. */
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/* ---------------------------------------------------------------------------
 * Metals
 * ------------------------------------------------------------------------- */

interface Metal {
  /** Bright edge of the sweep. */
  readonly light: string;
  /** The nominal colour of the metal. */
  readonly base: string;
  readonly mid: string;
  readonly dark: string;
  /** Rim stroke, so the coin reads as an object rather than a flat blob. */
  readonly rim: string;
  /** Struck detail (numerals, portrait). */
  readonly ink: string;
  /** Deepest shadow: hair mass, crown band — must be darker than `ink`. */
  readonly inkDeep: string;
}

const COPPER: Metal = {
  light: '#f0bd82',
  base: '#b87333',
  mid: '#9c5c25',
  dark: '#7a4419',
  rim: '#5f330f',
  ink: '#472506',
  inkDeep: '#2b1503',
};

const SILVER: Metal = {
  light: '#f4f7f9',
  base: '#c0c4c8',
  mid: '#a3a8ad',
  dark: '#878c92',
  rim: '#6e7379',
  ink: '#343a40',
  inkDeep: '#1c2126',
};

const GOLD: Metal = {
  light: '#f7e6a0',
  base: '#d4af37',
  mid: '#b8952a',
  dark: '#9a7a1c',
  rim: '#7c6111',
  ink: '#463608',
  inkDeep: '#291f04',
};

/* ---------------------------------------------------------------------------
 * Deterministic monarch choice
 * ------------------------------------------------------------------------- */

/** FNV-1a over the four bytes of the seed plus the denomination. */
function hash32(value: number, seed: number): number {
  let h = 2166136261;
  h = Math.imul(h ^ (value & 0xff), 16777619);
  h = Math.imul(h ^ ((value >>> 8) & 0xff), 16777619);
  for (let i = 0; i < 4; i += 1) {
    h = Math.imul(h ^ ((seed >>> (i * 8)) & 0xff), 16777619);
  }
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Which monarch a coin shows when the caller does not say.
 *
 * Deterministic in (value, seed), so a given coin keeps its face for as long as
 * it keeps its seed — across every re-render, drag and animation frame.
 * Weighted ~72/28 toward Elizabeth II, which is roughly what a handful of real
 * change looks like today.
 */
export function monarchFor(value: CoinValue, seed = 0): Monarch {
  return hash32(value, seed) % 100 < 72 ? 'elizabeth' : 'charles';
}

/* ---------------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------------- */

export interface CoinSVGProps {
  value: CoinValue;
  /** Multiplier on the base 3.2px/mm scale. Default 1. */
  scale?: number | undefined;
  /** Which obverse portrait. Omitted => chosen pseudo-randomly but STABLY from `seed`. */
  monarch?: Monarch | undefined;
  /** Stable per-coin seed so a given coin instance keeps its monarch across re-renders. */
  seed?: number | undefined;
  /** Which face to show. Default 'reverse' (the side showing the value). */
  face?: 'obverse' | 'reverse' | undefined;
  className?: string | undefined;
  /** Accessible name; defaults to the denomination label e.g. "5p". */
  title?: string | undefined;
}

/* ---------------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------------- */

export default function CoinSVG({
  value,
  scale = 1,
  monarch,
  seed,
  face = 'reverse',
  className,
  title,
}: CoinSVGProps): JSX.Element {
  const spec = COIN_GEOMETRY[value];
  const label = COIN_LABEL[value];

  // The coin's own square, in millimetre-derived base pixels.
  const box = coinDiameterPx(value, 1);
  const px = coinDiameterPx(value, scale);
  const c = box / 2;

  const bimetallic = isBimetallic(spec.colour);
  const outer: Metal = bimetallic ? GOLD : spec.colour === 'copper' ? COPPER : SILVER;
  // Every UK bimetallic coin is a gold-coloured ring around a silver centre.
  const field: Metal = bimetallic ? SILVER : outer;

  const rimW = Math.max(0.8, box * 0.02);
  const edgePath = coinEdgePath(value, rimW / 2);
  const innerRimPath = coinEdgePath(value, box * 0.075);
  const discR = (box * innerDiscFraction(value)) / 2;

  // The clear area the numerals / portrait live in.
  const fieldD = bimetallic ? discR * 2 * 0.94 : box * (spec.shape === 'heptagon' ? 0.78 : 0.8);

  const chosenMonarch: Monarch = monarch ?? monarchFor(value, seed ?? 0);

  // Unique-per-appearance gradient ids. Two identical coins on one page produce
  // the same id, but also byte-identical gradient definitions, so referencing
  // the first is correct either way.
  const uid = `hs-coin-${value}-${face}${face === 'obverse' ? `-${chosenMonarch}` : ''}`;
  const titleId = `${uid}-title`;

  /* -- numerals ----------------------------------------------------------- */
  // Width is budgeted first and the font size derived from it, then pinned with
  // textLength, so "10p" fits on a 78px disc and "£2" fills a 91px one on every
  // platform regardless of which font in the stack actually resolves.
  const glyphs = label.length;
  const textW = fieldD * (glyphs >= 3 ? 0.9 : 0.7);
  const fontSize = textW / (0.6 * glyphs);
  const textY = c + fontSize * 0.35;
  const emboss = box * 0.014;

  /* -- portrait ----------------------------------------------------------- */
  const portraitD = bimetallic ? discR * 2 * 0.96 : box * (spec.shape === 'heptagon' ? 0.78 : 0.82);
  const portraitScale = portraitD / PORTRAIT_BOX;
  const portraitX = c - portraitD / 2;
  const portraitY = c - portraitD / 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-labelledby={titleId}
      className={className}
      // Belt and braces: the intrinsic size must survive `w-full`, flex
      // stretching and grid sizing, because relative coin size IS the lesson.
      style={{ width: px, height: px, flex: 'none', display: 'block' }}
      focusable="false"
    >
      <title id={titleId}>{title ?? label}</title>

      <defs>
        <linearGradient id={`${uid}-outer`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={outer.light} />
          <stop offset="34%" stopColor={outer.base} />
          <stop offset="70%" stopColor={outer.mid} />
          <stop offset="100%" stopColor={outer.dark} />
        </linearGradient>
        {bimetallic ? (
          <linearGradient id={`${uid}-inner`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={field.light} />
            <stop offset="34%" stopColor={field.base} />
            <stop offset="70%" stopColor={field.mid} />
            <stop offset="100%" stopColor={field.dark} />
          </linearGradient>
        ) : null}
        <radialGradient id={`${uid}-sheen`} cx="0.32" cy="0.26" r="0.72">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The blank: outer edge, rim stroke. */}
      <path
        d={edgePath}
        fill={`url(#${uid}-outer)`}
        stroke={outer.rim}
        strokeWidth={rimW}
        strokeLinejoin="round"
      />

      {/* Milled (grooved) edge, on the denominations that really have one. */}
      {spec.milled ? (
        <path
          d={millingPath(c, c, c - rimW * 0.8, c * 0.9, Math.max(40, Math.round(box * 0.9)))}
          fill="none"
          stroke={outer.dark}
          strokeWidth={box * 0.012}
          strokeOpacity={0.45}
        />
      ) : null}

      {/* Raised inner rim. */}
      <path
        d={innerRimPath}
        fill="none"
        stroke={outer.dark}
        strokeWidth={box * 0.013}
        strokeOpacity={0.4}
        strokeLinejoin="round"
      />

      {/* Bimetallic centre: silver disc inside the gold ring. */}
      {bimetallic ? (
        <path
          d={circlePath(c, c, discR)}
          fill={`url(#${uid}-inner)`}
          stroke={field.rim}
          strokeWidth={box * 0.014}
          strokeOpacity={0.7}
        />
      ) : null}

      {face === 'reverse' ? (
        <g>
          {/* Struck-metal effect: a light copy offset down, then the dark face. */}
          <text
            x={c}
            y={textY + emboss}
            textAnchor="middle"
            textLength={textW}
            lengthAdjust="spacingAndGlyphs"
            fontFamily={FONT_STACK}
            fontWeight={800}
            fontSize={fontSize}
            fill={field.light}
            fillOpacity={0.6}
          >
            {label}
          </text>
          <text
            x={c}
            y={textY}
            textAnchor="middle"
            textLength={textW}
            lengthAdjust="spacingAndGlyphs"
            fontFamily={FONT_STACK}
            fontWeight={800}
            fontSize={fontSize}
            fill={field.ink}
          >
            {label}
          </text>
        </g>
      ) : (
        <g>
          <g
            transform={`translate(${portraitX + emboss},${portraitY + emboss}) scale(${portraitScale})`}
            opacity={0.45}
          >
            <MonarchPortrait monarch={chosenMonarch} fill={field.light} shade={field.light} />
          </g>
          <g transform={`translate(${portraitX},${portraitY}) scale(${portraitScale})`}>
            <MonarchPortrait monarch={chosenMonarch} fill={field.ink} shade={field.inkDeep} />
          </g>
        </g>
      )}

      {/* Specular sweep last, so it sits over the struck detail like real metal. */}
      <path d={edgePath} fill={`url(#${uid}-sheen)`} pointerEvents="none" />
    </svg>
  );
}
