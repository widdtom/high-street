/* =============================================================================
 * SAVE SCHEMA — the shared contract.
 *
 * MONEY IS INTEGER PENCE. `purse` and `moneyBox` are lists of the actual coins
 * she is holding, never balances. She physically moves coins between them.
 * ============================================================================= */

import type { CoinValue, Pence, Stage } from '../engine/types';

export const SAVE_KEY_V1 = 'highstreet.save.v1';
/**
 * The storage key stays at `.v2` for v3 saves on purpose: v2 -> v3 only adds a
 * field, and migrateToCurrent() upgrades whatever schemaVersion it finds under
 * this key. Renaming the key would strand every existing v2 save.
 */
export const SAVE_KEY = 'highstreet.save.v2';
export const CURRENT_SCHEMA_VERSION = 3;

/** Food meter position. Three segments; one food purchase fills one. */
export type FoodMeter = 0 | 1 | 2 | 3;

/** Something she bought, and the week she bought it in. */
export interface BagEntry {
  itemId: string;
  boughtWeek: number;
}

/**
 * One completed purchase. `attempts` counts how many times she pressed Pay
 * before it went through — 1 means she got it right first time.
 *
 * `stage` is not in the prompt's schema but stage progression needs it: the
 * rule is "the last 10 entries are all at the current stage", which cannot be
 * evaluated without knowing each entry's stage. It also lets the grown-ups'
 * screen show the evidence.
 */
export interface TransactionRecord {
  price: Pence;
  attempts: number;
  ts: number;
  stage: Stage;
}

/** Counts of how often each coin was involved in a short payment. */
export type CoinErrorMap = Record<CoinValue, number>;

export interface SaveData {
  schemaVersion: number;
  /** Coins in her purse. */
  purse: CoinValue[];
  /** Coins she has set aside. No lock, no penalty, no interest. */
  moneyBox: CoinValue[];
  stage: Stage;
  /** In-game week counter, starting at 1. The only unit of time. */
  week: number;
  bag: BagEntry[];
  /** itemIds she has placed on the bedroom shelf. */
  bedroom: string[];
  foodMeter: FoodMeter;
  /** 0..7. A 10p top-up sets this to 7. */
  electricityDays: number;
  /** itemId she is saving toward, or null. */
  savingGoal: string | null;
  transactionLog: TransactionRecord[];
  coinErrors: CoinErrorMap;
  /**
   * The week she last finished a bakery shift, or null if she never has. One
   * shift a week: the wages are paid in the same reducer step that sets this,
   * so a reload can never pay her twice.
   */
  shiftWeek: number | null;
}

/* ---------------------------------------------------------------------------
 * The v1 shape, kept verbatim so the migration has something real to read.
 * ------------------------------------------------------------------------- */

export interface SaveDataV1 {
  schemaVersion: 1;
  purse: CoinValue[];
  stage: Stage;
  transactionLog: { price: Pence; correct: boolean; ts: number }[];
  coinErrors: CoinErrorMap;
}

export const ALL_COIN_VALUES_LIST: readonly CoinValue[] = [1, 2, 5, 10, 20, 50, 100, 200];

export function emptyCoinErrors(): CoinErrorMap {
  return { 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 200: 0 };
}

/**
 * A brand new game. Week 1's pocket money (30p) is already in her purse as
 * real coins, spread across denominations so the first shop visit has
 * something to think about. Anything more she earns at the bakery.
 */
export function freshSave(): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    purse: [10, 10, 5, 2, 2, 1],
    moneyBox: [],
    stage: 1,
    week: 1,
    bag: [],
    bedroom: [],
    foodMeter: 0,
    electricityDays: 0,
    savingGoal: null,
    transactionLog: [],
    coinErrors: emptyCoinErrors(),
    shiftWeek: null,
  };
}
