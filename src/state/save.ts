/* =============================================================================
 * MONEY IS INTEGER PENCE. The purse is an array of coins she actually holds,
 * never a balance. She holds coins, not a number. This matters.
 * ============================================================================= */

import type { CoinValue, Pence, Stage } from '../engine/types';

export const SAVE_KEY = 'highstreet.save.v1';
export const CURRENT_SCHEMA_VERSION = 1;

/** One recorded attempt to pay for something. */
export interface TransactionRecord {
  price: Pence;
  correct: boolean;
  ts: number;
}

/** Counts of how often each coin was involved in a mistaken payment. */
export type CoinErrorMap = Record<CoinValue, number>;

export interface SaveData {
  schemaVersion: number;
  /** The actual coins she holds, not a total. */
  purse: CoinValue[];
  stage: Stage;
  transactionLog: TransactionRecord[];
  coinErrors: CoinErrorMap;
}

const VALID_COIN_VALUES: readonly number[] = [1, 2, 5, 10, 20, 50, 100, 200];

export function emptyCoinErrors(): CoinErrorMap {
  return { 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 200: 0 };
}

/**
 * A brand new game. She starts with her pocket money as real coins:
 * 10p + 10p + 5p + 2p + 2p + 1p = 30p, deliberately spread across
 * denominations so the first shop visit has something to think about.
 */
export function freshSave(): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    purse: [10, 10, 5, 2, 2, 1],
    stage: 1,
    transactionLog: [],
    coinErrors: emptyCoinErrors(),
  };
}

/**
 * Migration hook. Each future schema version adds a step here that upgrades
 * the previous shape in place. Returns null if the data cannot be salvaged.
 */
function migrate(raw: Record<string, unknown>): SaveData | null {
  const version = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;

  if (version > CURRENT_SCHEMA_VERSION) {
    // A save from a newer build of the app. Don't guess — start fresh.
    return null;
  }

  // v0 -> v1 and any future steps go here, e.g.:
  // if (version < 2) { raw = upgradeV1ToV2(raw); }

  return validate(raw);
}

function isStage(value: unknown): value is Stage {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** Coerce unknown parsed JSON into a SaveData, or null if it is not usable. */
function validate(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const purseRaw = obj['purse'];
  if (!Array.isArray(purseRaw)) return null;
  const purse: CoinValue[] = [];
  for (const entry of purseRaw) {
    if (typeof entry !== 'number' || !Number.isInteger(entry)) return null;
    if (!VALID_COIN_VALUES.includes(entry)) return null;
    purse.push(entry as CoinValue);
  }

  const stage = isStage(obj['stage']) ? obj['stage'] : 1;

  const logRaw = obj['transactionLog'];
  const transactionLog: TransactionRecord[] = [];
  if (Array.isArray(logRaw)) {
    for (const entry of logRaw) {
      if (typeof entry !== 'object' || entry === null) continue;
      const rec = entry as Record<string, unknown>;
      const price = rec['price'];
      const correct = rec['correct'];
      const ts = rec['ts'];
      if (typeof price !== 'number' || !Number.isInteger(price)) continue;
      if (typeof correct !== 'boolean') continue;
      if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
      transactionLog.push({ price, correct, ts });
    }
  }

  const coinErrors = emptyCoinErrors();
  const errRaw = obj['coinErrors'];
  if (typeof errRaw === 'object' && errRaw !== null) {
    for (const value of VALID_COIN_VALUES) {
      const count = (errRaw as Record<string, unknown>)[String(value)];
      if (typeof count === 'number' && Number.isInteger(count) && count >= 0) {
        coinErrors[value as CoinValue] = count;
      }
    }
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    purse,
    stage,
    transactionLog,
    coinErrors,
  };
}

/**
 * Read the save. Anything corrupt, unparseable, or from an unknown schema
 * falls back to a fresh game rather than crashing.
 */
export function loadSave(): SaveData {
  let text: string | null = null;
  try {
    text = localStorage.getItem(SAVE_KEY);
  } catch {
    // Private mode, storage disabled, quota errors — play without persistence.
    return freshSave();
  }
  if (text === null) return freshSave();

  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return freshSave();
    return migrate(parsed as Record<string, unknown>) ?? freshSave();
  } catch {
    return freshSave();
  }
}

function writeNow(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable. The game keeps working in memory;
    // the parent area's export button is the backup route.
  }
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingData: SaveData | null = null;

/** Debounced write — 300ms. Never called on every render. */
export function saveDebounced(data: SaveData): void {
  pendingData = data;
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (pendingData !== null) writeNow(pendingData);
    pendingData = null;
  }, 300);
}

/** Force any pending debounced write to happen immediately. */
export function flushSave(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (pendingData !== null) {
    writeNow(pendingData);
    pendingData = null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing useful to do */
  }
}

/** Serialise the save for the parent-area export button. */
export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 2);
}

export type ImportResult =
  | { ok: true; data: SaveData }
  | { ok: false; error: string };

/** Parse a pasted save file. Never throws. */
export function importSave(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That doesn't look like a save file." };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: "That doesn't look like a save file." };
  }
  const data = migrate(parsed as Record<string, unknown>);
  if (data === null) {
    return { ok: false, error: 'That save file could not be read.' };
  }
  return { ok: true, data };
}
