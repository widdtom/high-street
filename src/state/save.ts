/* =============================================================================
 * MONEY IS INTEGER PENCE. The purse and money box are arrays of the coins she
 * actually holds, never balances. She holds coins, not a number.
 * ============================================================================= */

import { migrateToCurrent } from './migrate';
import {
  CURRENT_SCHEMA_VERSION,
  SAVE_KEY,
  SAVE_KEY_V1,
  emptyCoinErrors,
  freshSave,
  type SaveData,
} from './saveTypes';

export {
  CURRENT_SCHEMA_VERSION,
  SAVE_KEY,
  SAVE_KEY_V1,
  emptyCoinErrors,
  freshSave,
} from './saveTypes';
export type {
  BagEntry,
  CoinErrorMap,
  FoodMeter,
  SaveData,
  SaveDataV1,
  TransactionRecord,
} from './saveTypes';

/**
 * Read the save. Anything corrupt, unparseable, or from an unknown schema
 * falls back to a fresh game rather than crashing.
 *
 * A v1 save under the old key is migrated and rewritten under the v2 key. The
 * v1 key is deliberately left in place as a belt-and-braces backup until the
 * next successful write cycle — losing a child's teddy collection to a bad
 * migration is not recoverable.
 */
export function loadSave(): SaveData {
  let text: string | null = null;
  try {
    text = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(SAVE_KEY_V1);
  } catch {
    // Private mode, storage disabled, quota errors — play without persistence.
    return freshSave();
  }
  if (text === null) return freshSave();

  try {
    const parsed: unknown = JSON.parse(text);
    return migrateToCurrent(parsed) ?? freshSave();
  } catch {
    return freshSave();
  }
}

function writeNow(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable. The game keeps working in memory; the
    // grown-ups' export button is the backup route.
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
    localStorage.removeItem(SAVE_KEY_V1);
  } catch {
    /* nothing useful to do */
  }
}

/** Serialise the save for the grown-ups' export button. */
export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 2);
}

export type ImportResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** Parse a pasted save file. Never throws. Accepts v1 and v2 alike. */
export function importSave(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That doesn't look like a save file." };
  }
  const data = migrateToCurrent(parsed);
  if (data === null) {
    return { ok: false, error: 'That save file could not be read.' };
  }
  return { ok: true, data };
}

/** A fresh game with every counter cleared. Used by the grown-ups' reset. */
export function brandNewSave(): SaveData {
  return { ...freshSave(), coinErrors: emptyCoinErrors(), schemaVersion: CURRENT_SCHEMA_VERSION };
}
