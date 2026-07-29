/* =============================================================================
 * COIN TABLE
 * Physical facts about the eight circulating UK coins, plus stage gating.
 * Pure data + pure functions. No I/O, no randomness, no DOM.
 * All monetary values are INTEGER PENCE.
 * ============================================================================= */

import type { CoinSpec, CoinValue, Stage } from './types';

/**
 * The eight circulating UK denominations, ascending by value.
 * Diameters are the Royal Mint's published specifications in millimetres.
 */
export const COIN_SPECS: readonly CoinSpec[] = Object.freeze([
  { value: 1, label: '1p', diameterMm: 20.3, shape: 'circle', colour: 'copper' },
  { value: 2, label: '2p', diameterMm: 25.9, shape: 'circle', colour: 'copper' },
  { value: 5, label: '5p', diameterMm: 18.0, shape: 'circle', colour: 'silver' },
  { value: 10, label: '10p', diameterMm: 24.5, shape: 'circle', colour: 'silver' },
  { value: 20, label: '20p', diameterMm: 21.4, shape: 'heptagon', colour: 'silver' },
  { value: 50, label: '50p', diameterMm: 27.3, shape: 'heptagon', colour: 'silver' },
  { value: 100, label: '£1', diameterMm: 23.4, shape: 'dodecagon', colour: 'bimetallic-gold-outer' },
  { value: 200, label: '£2', diameterMm: 28.4, shape: 'circle', colour: 'bimetallic-silver-inner' },
] as const satisfies readonly CoinSpec[]);

/** Every coin value, ascending. */
export const ALL_COIN_VALUES: readonly CoinValue[] = Object.freeze(
  COIN_SPECS.map((s) => s.value),
);

/** Lookup table from denomination to its physical spec. */
export const COIN_SPEC_BY_VALUE: Record<CoinValue, CoinSpec> = Object.freeze(
  COIN_SPECS.reduce((acc, spec) => {
    acc[spec.value] = spec;
    return acc;
  }, {} as Record<CoinValue, CoinSpec>),
);

/** Coins unlocked at each stage, ascending. Frozen so callers cannot mutate the source. */
const STAGE_COINS: Record<Stage, readonly CoinValue[]> = Object.freeze({
  1: Object.freeze([1, 2, 5, 10]) as readonly CoinValue[],
  2: Object.freeze([1, 2, 5, 10, 20]) as readonly CoinValue[],
  3: Object.freeze([1, 2, 5, 10, 20, 50]) as readonly CoinValue[],
  4: Object.freeze([1, 2, 5, 10, 20, 50, 100, 200]) as readonly CoinValue[],
});

/** True when `s` is one of the four valid stages. */
export function isStage(s: unknown): s is Stage {
  return s === 1 || s === 2 || s === 3 || s === 4;
}

/** True when `v` is one of the eight circulating denominations. */
export function isCoinValue(v: unknown): v is CoinValue {
  return (
    v === 1 || v === 2 || v === 5 || v === 10 || v === 20 || v === 50 || v === 100 || v === 200
  );
}

/**
 * Throws a TypeError unless `stage` is 1, 2, 3 or 4.
 * Typed as a plain guard rather than an `asserts` signature so that it stays
 * callable from any module without TypeScript's explicit-annotation rule.
 */
export function assertStage(stage: Stage): void {
  if (!isStage(stage)) {
    throw new TypeError(`stage must be 1, 2, 3 or 4; received ${String(stage)}`);
  }
}

/** Throws a TypeError unless `value` is a circulating denomination. */
export function assertCoinValue(value: CoinValue): void {
  if (!isCoinValue(value)) {
    throw new TypeError(`not a UK coin denomination: ${String(value)}`);
  }
}

/**
 * Coins available to the player at `stage`, ascending.
 * Stage 1 => 1p 2p 5p 10p; Stage 2 adds 20p; Stage 3 adds 50p; Stage 4 adds £1 and £2.
 * Returns a fresh mutable array; callers may sort or slice it freely.
 */
export function coinsForStage(stage: Stage): CoinValue[] {
  assertStage(stage);
  return [...STAGE_COINS[stage]];
}

/** Millimetres-to-pixels factor used when drawing coins to scale. */
export const MM_TO_PX = 3.2;

/**
 * On-screen diameter in CSS pixels for a coin drawn at true relative size.
 * Not money — a float result is expected and correct here.
 */
export function coinDiameterPx(value: CoinValue, scale = 1): number {
  assertCoinValue(value);
  if (!Number.isFinite(scale)) {
    throw new TypeError(`scale must be a finite number; received ${String(scale)}`);
  }
  return COIN_SPEC_BY_VALUE[value].diameterMm * MM_TO_PX * scale;
}
