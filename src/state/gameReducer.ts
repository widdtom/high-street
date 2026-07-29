/* =============================================================================
 * MONEY IS INTEGER PENCE. The purse is a list of coins. Paying removes those
 * exact coins; change adds new coins. Nothing here is a balance.
 *
 * NO FAIL STATES. Paying too little costs nothing: no coins move, nothing is
 * deducted, and nothing visible is recorded as a failure.
 * ============================================================================= */

import { checkPayment, totalOf } from '../engine';
import type { CoinValue, Pence } from '../engine/types';
import { emptyCoinErrors, freshSave, type SaveData } from './save';

export type Screen = 'street' | 'bakery' | 'purse' | 'parent';

/** What the shopkeeper just said, shown until she dismisses it. */
export type Outcome =
  | { kind: 'exact'; itemId: string }
  | { kind: 'short'; shortBy: Pence }
  | { kind: 'over'; itemId: string; changeCoins: CoinValue[] };

export interface BakeryState {
  /** The item she has chosen, or null if she hasn't chosen yet. */
  selectedItemId: string | null;
  /**
   * Indices into `save.purse` of the coins currently in the payment area.
   * Indices are stable because the purse only changes when a payment completes,
   * and completing a payment clears this list.
   */
  paidIndices: number[];
  outcome: Outcome | null;
}

export interface GameState {
  save: SaveData;
  screen: Screen;
  /** Where to return to when the purse overlay is closed. */
  previousScreen: Screen;
  bakery: BakeryState;
  /** Items bought this session. Not persisted in schema v1. */
  bag: string[];
}

export const emptyBakeryState: BakeryState = {
  selectedItemId: null,
  paidIndices: [],
  outcome: null,
};

export function initialState(save: SaveData): GameState {
  return {
    save,
    screen: 'street',
    previousScreen: 'street',
    bakery: emptyBakeryState,
    bag: [],
  };
}

export type GameAction =
  | { type: 'go'; screen: Screen }
  | { type: 'selectItem'; itemId: string }
  | { type: 'clearItem' }
  | { type: 'addCoin'; index: number }
  | { type: 'removeCoin'; index: number }
  | { type: 'clearPayment' }
  | { type: 'pay'; itemId: string; price: Pence; ts: number }
  | { type: 'dismissOutcome' }
  | { type: 'importSave'; data: SaveData }
  | { type: 'resetGame' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'go': {
      if (action.screen === state.screen) return state;
      // Leaving the bakery abandons any half-built payment; no coins are lost
      // because coins in the payment area never left the purse.
      const bakery = action.screen === 'bakery' ? state.bakery : emptyBakeryState;
      return {
        ...state,
        screen: action.screen,
        previousScreen: state.screen === 'purse' ? state.previousScreen : state.screen,
        bakery,
      };
    }

    case 'selectItem':
      return {
        ...state,
        bakery: { selectedItemId: action.itemId, paidIndices: [], outcome: null },
      };

    case 'clearItem':
      return { ...state, bakery: emptyBakeryState };

    case 'addCoin': {
      if (state.bakery.paidIndices.includes(action.index)) return state;
      if (action.index < 0 || action.index >= state.save.purse.length) return state;
      return {
        ...state,
        bakery: {
          ...state.bakery,
          paidIndices: [...state.bakery.paidIndices, action.index],
          outcome: null,
        },
      };
    }

    case 'removeCoin':
      return {
        ...state,
        bakery: {
          ...state.bakery,
          paidIndices: state.bakery.paidIndices.filter((i) => i !== action.index),
          outcome: null,
        },
      };

    case 'clearPayment':
      return { ...state, bakery: { ...state.bakery, paidIndices: [], outcome: null } };

    case 'pay': {
      const { purse, stage } = state.save;
      const offered = state.bakery.paidIndices
        .map((i) => purse[i])
        .filter((c): c is CoinValue => c !== undefined);
      if (offered.length === 0) return state;

      const result = checkPayment(action.price, offered, stage);

      if (result.kind === 'short') {
        // Nothing is deducted. Coins stay exactly where she put them.
        // The shortfall is recorded only for the grown-ups' view.
        const coinErrors = { ...state.save.coinErrors };
        for (const coin of offered) coinErrors[coin] += 1;
        return {
          ...state,
          save: {
            ...state.save,
            coinErrors,
            transactionLog: [
              ...state.save.transactionLog,
              { price: action.price, correct: false, ts: action.ts },
            ],
          },
          bakery: { ...state.bakery, outcome: { kind: 'short', shortBy: result.shortBy } },
        };
      }

      // Exact or over: the offered coins leave the purse.
      const spent = new Set(state.bakery.paidIndices);
      const remaining = purse.filter((_, i) => !spent.has(i));
      const changeCoins = result.kind === 'over' ? result.changeCoins : [];
      const nextPurse = [...remaining, ...changeCoins];

      const outcome: Outcome =
        result.kind === 'over'
          ? { kind: 'over', itemId: action.itemId, changeCoins }
          : { kind: 'exact', itemId: action.itemId };

      return {
        ...state,
        save: {
          ...state.save,
          purse: nextPurse,
          transactionLog: [
            ...state.save.transactionLog,
            { price: action.price, correct: true, ts: action.ts },
          ],
        },
        bag: [...state.bag, action.itemId],
        bakery: { selectedItemId: null, paidIndices: [], outcome },
      };
    }

    case 'dismissOutcome':
      return { ...state, bakery: { ...state.bakery, outcome: null } };

    case 'importSave':
      return { ...initialState(action.data), screen: state.screen };

    case 'resetGame':
      return initialState({ ...freshSave(), coinErrors: emptyCoinErrors() });

    default:
      return state;
  }
}

/** Total of the coins currently in the payment area. */
export function paymentTotal(state: GameState): Pence {
  const coins = state.bakery.paidIndices
    .map((i) => state.save.purse[i])
    .filter((c): c is CoinValue => c !== undefined);
  return totalOf(coins);
}
