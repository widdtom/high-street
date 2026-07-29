/* =============================================================================
 * COIN GEOMETRY — everything here is generated from numbers, never hand-drawn.
 *
 * The single most important thing this game teaches is that a UK coin's SIZE
 * does not track its VALUE. A 5p (18.0 mm) is the smallest coin in the set and
 * is visibly *smaller* than a 2p (25.9 mm) worth less than half as much. So the
 * physical millimetre figures below are load-bearing: never normalise them,
 * never let a layout stretch them.
 *
 * Units: all helpers work in "base px", where 1 mm = MM_TO_PX px. A coin's
 * drawing box is a square of side `coinDiameterPx(value, 1)` and the <svg>
 * viewBox is exactly that box, so a coin at scale 1 is 1 user-unit = 1 CSS px.
 * ============================================================================= */

import type { CoinColour, CoinShape, CoinValue } from '../../engine/types';

/** Rendering scale: one real millimetre becomes this many CSS pixels at scale 1. */
export const MM_TO_PX = 3.2;

/** Number of sides on the 20p / 50p equilateral-curve heptagon. */
export const HEPTAGON_SIDES = 7;

/** Number of sides on the £1 dodecagon. */
export const DODECAGON_SIDES = 12;

/** A point in the coin's local drawing box. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/* ---------------------------------------------------------------------------
 * The coin table. This is a deliberate LOCAL copy of the physical facts so the
 * art layer has no dependency on the game engine's coin module.
 * ------------------------------------------------------------------------- */

/** Physical + visual facts the renderer needs for one denomination. */
export interface CoinGeometrySpec {
  readonly value: CoinValue;
  readonly label: string;
  readonly diameterMm: number;
  readonly shape: CoinShape;
  readonly colour: CoinColour;
  /** Real coins have milled (grooved) edges only on some denominations. */
  readonly milled: boolean;
}

export const COIN_GEOMETRY: Record<CoinValue, CoinGeometrySpec> = {
  1: { value: 1, label: '1p', diameterMm: 20.3, shape: 'circle', colour: 'copper', milled: false },
  2: { value: 2, label: '2p', diameterMm: 25.9, shape: 'circle', colour: 'copper', milled: false },
  5: { value: 5, label: '5p', diameterMm: 18.0, shape: 'circle', colour: 'silver', milled: true },
  10: { value: 10, label: '10p', diameterMm: 24.5, shape: 'circle', colour: 'silver', milled: true },
  20: { value: 20, label: '20p', diameterMm: 21.4, shape: 'heptagon', colour: 'silver', milled: false },
  50: { value: 50, label: '50p', diameterMm: 27.3, shape: 'heptagon', colour: 'silver', milled: false },
  100: {
    value: 100,
    label: '£1',
    diameterMm: 23.4,
    shape: 'dodecagon',
    colour: 'bimetallic-gold-outer',
    milled: false,
  },
  200: {
    value: 200,
    label: '£2',
    diameterMm: 28.4,
    shape: 'circle',
    colour: 'bimetallic-gold-outer',
    milled: true,
  },
};

/** Every denomination, smallest value first. */
export const COIN_VALUES: readonly CoinValue[] = [1, 2, 5, 10, 20, 50, 100, 200];

/** "1p" … "£1", "£2". */
export const COIN_LABEL: Record<CoinValue, string> = {
  1: '1p',
  2: '2p',
  5: '5p',
  10: '10p',
  20: '20p',
  50: '50p',
  100: '£1',
  200: '£2',
};

/**
 * The coin's on-screen size in CSS pixels: its true millimetre width times the
 * base 3.2 px/mm scale, times `scale`. This is the number that must reach the
 * <svg width>/<height> attributes untouched.
 */
export function coinDiameterPx(value: CoinValue, scale = 1): number {
  return COIN_GEOMETRY[value].diameterMm * MM_TO_PX * scale;
}

/* ---------------------------------------------------------------------------
 * Small numeric helpers
 * ------------------------------------------------------------------------- */

const TAU = Math.PI * 2;

/** Round to 3dp so path strings stay short and stable across runs. */
function f(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function pt(p: Point): string {
  return `${f(p.x)} ${f(p.y)}`;
}

/** Wrapping array access that satisfies `noUncheckedIndexedAccess`. */
function at<T>(arr: readonly T[], i: number): T {
  const n = arr.length;
  if (n === 0) throw new Error('geometry: empty vertex list');
  const v = arr[((i % n) + n) % n];
  if (v === undefined) throw new Error('geometry: missing vertex');
  return v;
}

/** Point at distance `d` from `from`, travelling toward `to`. */
function toward(from: Point, to: Point, d: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const k = d / len;
  return { x: from.x + dx * k, y: from.y + dy * k };
}

/* ---------------------------------------------------------------------------
 * Regular polygons
 * ------------------------------------------------------------------------- */

/**
 * `sides` vertices evenly spaced on the circumscribed circle of radius `r`.
 * Vertex 0 sits at angle (-90° + rotationDeg), i.e. straight up when
 * rotationDeg is 0. Angles are exactly 2πk/sides apart.
 */
export function regularPolygonVertices(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rotationDeg = 0,
): Point[] {
  const start = (-90 + rotationDeg) * (Math.PI / 180);
  const out: Point[] = [];
  for (let k = 0; k < sides; k += 1) {
    const a = start + (TAU * k) / sides;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

/**
 * A straight-edged regular polygon. `cornerRadius` (px) optionally rounds the
 * corners with a quadratic tangent-to-tangent fillet — the flats stay flat and
 * unmistakable, which is exactly what the 12-sided £1 needs.
 */
export function regularPolygonPath(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rotationDeg = 0,
  cornerRadius = 0,
): string {
  const verts = regularPolygonVertices(cx, cy, r, sides, rotationDeg);
  if (cornerRadius <= 0) {
    return `M ${verts.map(pt).join(' L ')} Z`;
  }
  // Never eat more than 40% of an edge, so every flat stays obvious.
  const edgeLen = 2 * r * Math.sin(Math.PI / sides);
  const k = Math.min(cornerRadius, edgeLen * 0.4);

  const parts: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const prev = at(verts, i - 1);
    const cur = at(verts, i);
    const next = at(verts, i + 1);
    const enter = toward(cur, prev, k);
    const exit = toward(cur, next, k);
    parts.push(`${i === 0 ? 'M' : 'L'} ${pt(enter)}`);
    parts.push(`Q ${pt(cur)} ${pt(exit)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/* ---------------------------------------------------------------------------
 * Equilateral-curve heptagon (the 20p / 50p shape)
 * ------------------------------------------------------------------------- */

/**
 * The constant-width heptagon used by the 20p and 50p.
 *
 * Construction: put 7 vertices at 2πk/7 on the circumscribed circle of radius
 * `r`. The edge joining vertex k to vertex k+1 is a circular ARC whose centre
 * is the *opposite* vertex, k+4 — the only vertex that is the same number of
 * steps (3) from both endpoints. Its radius is therefore the vertex-to-opposite
 * -vertex distance, 2·r·sin(3π/7), and that distance is the shape's width in
 * EVERY direction. That constant width is why the real coins work in vending
 * machines, and it makes the sides visibly bulge outward rather than run
 * straight.
 *
 * Vertex 0 points straight up, matching how the real coins sit.
 */
export function equilateralCurveHeptagonPath(cx: number, cy: number, r: number): string {
  const n = HEPTAGON_SIDES;
  const opposite = (n - 1) / 2; // 3 steps either way => the arc radius
  const arcR = 2 * r * Math.sin((opposite * Math.PI) / n);
  const verts = regularPolygonVertices(cx, cy, r, n, 0);

  const parts: string[] = [`M ${pt(at(verts, 0))}`];
  for (let k = 0; k < n; k += 1) {
    // Each arc subtends only 180°/7 ≈ 25.7° at its centre, so large-arc = 0,
    // and traversal is in the increasing-angle (SVG-positive) direction.
    parts.push(`A ${f(arcR)} ${f(arcR)} 0 0 1 ${pt(at(verts, k + 1))}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/** Circumradius that yields an equilateral-curve heptagon of the given width. */
export function heptagonCircumradiusForWidth(width: number): number {
  return width / (2 * Math.sin((3 * Math.PI) / HEPTAGON_SIDES));
}

/**
 * A constant-width heptagon is left/right symmetric but NOT vertically centred
 * on its circumcentre: it runs from (cy − r) at the top vertex to
 * (cy − r + width) at the bottom arc. This is how far to push the circumcentre
 * down so the shape sits centred in its square box.
 */
export function heptagonCentreOffsetY(width: number): number {
  return heptagonCircumradiusForWidth(width) - width / 2;
}

/* ---------------------------------------------------------------------------
 * Circles
 * ------------------------------------------------------------------------- */

/** A full circle as a <path>, so every coin shape can share one element type. */
export function circlePath(cx: number, cy: number, r: number): string {
  return [
    `M ${f(cx - r)} ${f(cy)}`,
    `A ${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}`,
    `A ${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}`,
    'Z',
  ].join(' ');
}

/* ---------------------------------------------------------------------------
 * Coin-level geometry
 * ------------------------------------------------------------------------- */

/**
 * Radius of the circumscribed circle for a coin whose MAXIMUM DIAMETER is
 * `width` px.
 *
 * Quoted UK coin diameters are maximum diameters, so `width` is always the
 * greatest distance between two points on the outline — never the
 * across-the-flats measurement. Getting this wrong for the £1 inflated its
 * true maximum diameter to ~24.2mm and pushed it past the 10p at 24.5mm,
 * inverting the real size order. A £1 is fractionally SMALLER than a 10p, and
 * preserving that ordering is the whole point of using accurate diameters.
 */
export function shapeCircumradius(shape: CoinShape, width: number): number {
  switch (shape) {
    case 'circle':
      return width / 2;
    case 'heptagon':
      // A constant-width body's maximum diameter equals its width.
      return heptagonCircumradiusForWidth(width);
    case 'dodecagon':
      // 12 sides is even, so the shape is centrally symmetric and its maximum
      // diameter is vertex-to-opposite-vertex, i.e. twice the circumradius.
      return width / 2;
  }
}

/**
 * The greatest distance between any two points on a coin's rendered outline,
 * in base px. By construction this is exactly the quoted diameter, and the
 * ordering across the eight coins is asserted in tests.
 */
export function renderedMaxDiameterPx(value: CoinValue, scale = 1): number {
  return coinDiameterPx(value, scale);
}

/**
 * The outline of a coin's edge, drawn inside the square box
 * `0 0 box box` where box = coinDiameterPx(value, 1).
 *
 * `inset` shrinks the outline symmetrically (used for the raised inner rim).
 */
export function coinEdgePath(value: CoinValue, inset = 0): string {
  const spec = COIN_GEOMETRY[value];
  const box = coinDiameterPx(value, 1);
  const c = box / 2;
  const width = Math.max(1, box - inset * 2);

  switch (spec.shape) {
    case 'circle':
      return circlePath(c, c, width / 2);
    case 'heptagon':
      return equilateralCurveHeptagonPath(
        c,
        c + heptagonCentreOffsetY(width),
        heptagonCircumradiusForWidth(width),
      );
    case 'dodecagon':
      return regularPolygonPath(
        c,
        c,
        shapeCircumradius('dodecagon', width),
        DODECAGON_SIDES,
        // 15° = half a 30° step, which puts a FLAT at the top like the real £1.
        180 / DODECAGON_SIDES,
        box * 0.022,
      );
  }
}

/**
 * Radial tick marks for a milled (grooved) edge, as one multi-subpath string.
 * Generated, like everything else, from the vertex count and radius.
 */
export function millingPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  count: number,
): string {
  const parts: string[] = [];
  for (let k = 0; k < count; k += 1) {
    const a = (TAU * k) / count - Math.PI / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    parts.push(
      `M ${f(cx + rInner * ca)} ${f(cy + rInner * sa)} L ${f(cx + rOuter * ca)} ${f(cy + rOuter * sa)}`,
    );
  }
  return parts.join(' ');
}

/** True when the coin is drawn as a gold ring around a silver disc. */
export function isBimetallic(colour: CoinColour): boolean {
  return colour === 'bimetallic-gold-outer' || colour === 'bimetallic-silver-inner';
}

/**
 * Fraction of the coin's width taken by the inner disc on bimetallic coins.
 * Measured off the real coins: the £1's centre is a little under two thirds of
 * its width; the £2 has a much narrower ring, its centre nearly three quarters.
 */
export function innerDiscFraction(value: CoinValue): number {
  return value === 100 ? 0.645 : 0.735;
}
