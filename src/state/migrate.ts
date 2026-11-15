/* =============================================================================
 * SAVE MIGRATION — untrusted JSON in, a valid SaveData out (or null).
 *
 * MONEY IS INTEGER PENCE. Coins are validated against the eight circulating
 * denominations; nothing fractional survives this file.
 *
 * The contract is deliberately lopsided:
 *
 *   - NEVER throw. The caller has already parsed the JSON; everything after
 *     that is our problem, and a thrown error at boot means a child loses a
 *     game she cannot get back.
 *   - Repair, don't reject. A missing or nonsense FIELD gets a sane default. A
 *     malformed LOG ENTRY or COIN is dropped on its own. Only a value that is
 *     not a save at all — or one from a FUTURE schema we cannot understand —
 *     returns null.
 *   - Never guess forward. schemaVersion > CURRENT_SCHEMA_VERSION returns null
 *     rather than risk mangling a save written by a newer build.
 *
 * SHAPE. Migration is a chain of one-version steps over loose objects, followed
 * by a single coercion into the current typed shape. Adding v2 -> v3 later means
 * writing one more step function and adding one entry to MIGRATION_STEPS; the
 * coercion is rewritten for the new shape and nothing else moves.
 * ============================================================================= */

import type { CoinValue, Pence, Stage } from '../engine/types';
import { isCoinValue, isStage } from '../engine/coins';
import type { BagEntry, CoinErrorMap, FoodMeter, SaveData, TransactionRecord } from './saveTypes';
import { ALL_COIN_VALUES_LIST, CURRENT_SCHEMA_VERSION, emptyCoinErrors } from './saveTypes';

/* ---------------------------------------------------------------------------
 * PRIMITIVE GUARDS
 * ------------------------------------------------------------------------- */

type Loose = Record<string, unknown>;

/** A JSON object — not null, not an array, not a primitive. */
function isLooseObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Floor into an integer within [min, max]. Anything non-numeric => `fallback`. */
function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const floored = Math.floor(value);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

/* ---------------------------------------------------------------------------
 * FIELD COERCION — each one repairs a single field in isolation.
 * ------------------------------------------------------------------------- */

/**
 * A coin list. Entries that are not one of the eight circulating denominations
 * (a `3`, a `1.5`, a string, a null) are DROPPED INDIVIDUALLY, exactly as
 * malformed log entries are.
 *
 * Dropping rather than nulling the whole save is the lesser evil: a coin that
 * does not exist cannot be drawn, cannot be counted and cannot be spent, so
 * keeping it would break the purse screen — but discarding her entire game over
 * one bad element would be far worse, and there is no fail state in this game.
 */
function coerceCoinList(value: unknown): CoinValue[] {
  if (!Array.isArray(value)) return [];
  const out: CoinValue[] = [];
  for (const entry of value) {
    if (isCoinValue(entry)) out.push(entry);
  }
  return out;
}

function coerceStage(value: unknown): Stage {
  return isStage(value) ? value : 1;
}

/** The week counter is an integer >= 1. Week 0 does not exist. */
function coerceWeek(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const floored = Math.floor(value);
  return floored < 1 ? 1 : floored;
}

function coerceFoodMeter(value: unknown): FoodMeter {
  return clampInteger(value, 0, 3, 0) as FoodMeter;
}

function coerceElectricityDays(value: unknown): number {
  return clampInteger(value, 0, 7, 0);
}

function coerceSavingGoal(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function coerceStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && entry.length > 0) out.push(entry);
  }
  return out;
}

function coerceBag(value: unknown): BagEntry[] {
  if (!Array.isArray(value)) return [];
  const out: BagEntry[] = [];
  for (const entry of value) {
    if (!isLooseObject(entry)) continue;
    const itemId = entry.itemId;
    if (typeof itemId !== 'string' || itemId.length === 0) continue;
    out.push({ itemId, boughtWeek: coerceWeek(entry.boughtWeek) });
  }
  return out;
}

/**
 * One transaction. Returns null for an entry we cannot make sense of, and the
 * caller drops it — one corrupt row must not cost her the other nine.
 *
 * `attempts` defaults to 2, not 1, when it is missing or nonsense. 1 means "got
 * it right first time" and feeds stage progression; inventing that from a
 * damaged record would promote her on evidence that does not exist.
 */
function coerceLogEntry(value: unknown, fallbackStage: Stage): TransactionRecord | null {
  if (!isLooseObject(value)) return null;

  const price: unknown = value.price;
  if (!isFiniteInteger(price) || price < 0) return null;

  const rawAttempts: unknown = value.attempts;
  const attempts = isFiniteInteger(rawAttempts) && rawAttempts >= 1 ? rawAttempts : 2;

  const rawTs: unknown = value.ts;
  const ts = typeof rawTs === 'number' && Number.isFinite(rawTs) ? Math.floor(rawTs) : 0;

  return {
    price: price as Pence,
    attempts,
    ts,
    stage: isStage(value.stage) ? value.stage : fallbackStage,
  };
}

function coerceLog(value: unknown, fallbackStage: Stage): TransactionRecord[] {
  if (!Array.isArray(value)) return [];
  const out: TransactionRecord[] = [];
  for (const entry of value) {
    const record = coerceLogEntry(entry, fallbackStage);
    if (record !== null) out.push(record);
  }
  return out;
}

/** A week number >= 1, or null. Anything else means "never worked a shift". */
function coerceShiftWeek(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const floored = Math.floor(value);
  return floored < 1 ? null : floored;
}

/**
 * Coin-error counts. Always returns all eight keys, so no consumer ever meets
 * an `undefined` count. JSON object keys are strings, hence the String() lookup.
 */
function coerceCoinErrors(value: unknown): CoinErrorMap {
  const out = emptyCoinErrors();
  if (!isLooseObject(value)) return out;
  for (const coin of ALL_COIN_VALUES_LIST) {
    const count: unknown = value[String(coin)];
    if (isFiniteInteger(count) && count >= 0) out[coin] = count;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * THE CURRENT SHAPE
 * ------------------------------------------------------------------------- */

/**
 * Build a fully-populated current (v3) SaveData from a loose object. Every field is
 * repaired independently; no field is ever left `undefined`.
 */
function coerceCurrent(input: Loose): SaveData {
  const stage = coerceStage(input.stage);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    purse: coerceCoinList(input.purse),
    moneyBox: coerceCoinList(input.moneyBox),
    stage,
    week: coerceWeek(input.week),
    bag: coerceBag(input.bag),
    bedroom: coerceStringList(input.bedroom),
    foodMeter: coerceFoodMeter(input.foodMeter),
    electricityDays: coerceElectricityDays(input.electricityDays),
    savingGoal: coerceSavingGoal(input.savingGoal),
    transactionLog: coerceLog(input.transactionLog, stage),
    coinErrors: coerceCoinErrors(input.coinErrors),
    shiftWeek: coerceShiftWeek(input.shiftWeek),
  };
}

/* ---------------------------------------------------------------------------
 * THE MIGRATION CHAIN
 * ------------------------------------------------------------------------- */

/** One step up the version ladder: shape at version N in, shape at N+1 out. */
type MigrationStep = (input: Loose) => Loose;

/**
 * v1 -> v2. NOTHING IS LOST.
 *
 * `purse`, `stage` and `coinErrors` cross over verbatim. Each v1 log entry
 * `{price, correct, ts}` becomes `{price, attempts, ts, stage}`: `correct: true`
 * is one attempt, `correct: false` is two — v1 only recorded a boolean, and two
 * is the smallest number of attempts that is honestly "not first time". The
 * entry's stage is taken from the save's own stage, since v1 did not record a
 * per-entry stage; that is the best available answer and it keeps the stage
 * progression window evaluable.
 *
 * Everything v2 added starts empty: no money box, week 1, empty bag and bedroom,
 * both meters at zero, no saving goal.
 */
function migrateV1ToV2(input: Loose): Loose {
  const stage = coerceStage(input.stage);
  const v1Log = Array.isArray(input.transactionLog) ? input.transactionLog : [];

  const transactionLog = v1Log.map((entry: unknown) => {
    if (!isLooseObject(entry)) return entry;
    return {
      price: entry.price,
      attempts: entry.correct === true ? 1 : 2,
      ts: entry.ts,
      stage,
    };
  });

  return {
    ...input,
    schemaVersion: 2,
    stage,
    transactionLog,
    moneyBox: [],
    week: 1,
    bag: [],
    bedroom: [],
    foodMeter: 0,
    electricityDays: 0,
    savingGoal: null,
  };
}

/**
 * v2 -> v3. NOTHING IS LOST. The bakery shift arrives; she has never worked
 * one, so `shiftWeek` starts null and this week's shift is open to her.
 */
function migrateV2ToV3(input: Loose): Loose {
  return { ...input, schemaVersion: 3, shiftWeek: null };
}

/** Keyed by the version being migrated FROM. Add `[3, migrateV3ToV4]` next. */
const MIGRATION_STEPS: ReadonlyMap<number, MigrationStep> = new Map<number, MigrationStep>([
  [1, migrateV1ToV2],
  [2, migrateV2ToV3],
]);

/* ---------------------------------------------------------------------------
 * ENTRY POINT
 * ------------------------------------------------------------------------- */

/**
 * Turn a parsed-but-untrusted JSON value into a valid current-schema SaveData.
 *
 * Returns null — and only null — when the value is not a save we can use:
 *   - not a JSON object (null, an array, a string, a number);
 *   - no usable `schemaVersion`;
 *   - a schemaVersion NEWER than we understand (never guess at a future format);
 *   - a version with no migration path to the current one.
 *
 * Anything else is migrated up one version at a time and then repaired field by
 * field. Never throws.
 */
export function migrateToCurrent(raw: unknown): SaveData | null {
  if (!isLooseObject(raw)) return null;

  const version: unknown = raw.schemaVersion;
  if (!isFiniteInteger(version) || version < 1) return null;
  if (version > CURRENT_SCHEMA_VERSION) return null;

  let working: Loose = raw;
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATION_STEPS.get(v);
    if (step === undefined) return null;
    working = step(working);
  }

  return coerceCurrent(working);
}
