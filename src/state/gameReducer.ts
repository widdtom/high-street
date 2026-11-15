/* =============================================================================
 * MONEY IS INTEGER PENCE. Paying removes the exact coins she put down; change
 * adds new ones. The money box is a second pile of coins, not a balance.
 *
 * NO FAIL STATES. Paying too little costs nothing: no coins move, nothing is
 * deducted, and nothing visible is recorded as a failure. Running out of food
 * or electricity costs nothing either.
 * ============================================================================= */

import { checkPayment, minimumCoins, totalOf } from '../engine';
import { nextWeek, shouldAdvanceStage, nextStage } from '../engine/week';
import {
  checkChange,
  checkOrder,
  hasWorkedThisWeek,
  noToppings,
  shiftCustomers,
  shiftPay,
  wageCoins,
  type ChangeCheck,
  type OrderCheck,
  type Topping,
  type ToppingCounts,
} from '../engine/shift';
import type { CoinValue, Pence, Stage } from '../engine/types';
import {
  ELECTRICITY_WEEKLY,
  FOOD_METER_MAX,
  POCKET_MONEY,
  SHIFT_CUSTOMERS,
  STAGE_GATED_ITEMS,
  itemById,
} from '../data/economy';
import { brandNewSave } from './save';
import type { FoodMeter, SaveData } from './saveTypes';

export type Screen =
  | 'saturday'
  | 'street'
  | 'bakery'
  | 'greengrocer'
  | 'toyshop'
  | 'charity'
  | 'purse'
  | 'bedroom'
  | 'weekSummary'
  | 'parent'
  | 'shift';

export type ShopScreen = 'bakery' | 'greengrocer' | 'toyshop' | 'charity';

/** What the shopkeeper just said, shown until she dismisses it. */
export type Outcome =
  | { kind: 'exact'; itemId: string }
  | { kind: 'short'; shortBy: Pence }
  | { kind: 'over'; itemId: string; changeCoins: CoinValue[] };

/**
 * The payment in progress. One shape for all four shops and the electricity
 * top-up — there is exactly one payment implementation in this game.
 */
export interface PaymentState {
  selectedItemId: string | null;
  /**
   * Indices into `save.purse` of the coins in the payment area. Indices stay
   * stable because the purse only changes when a payment completes, and
   * completing one clears this list.
   */
  paidIndices: number[];
  outcome: Outcome | null;
  /** Presses of Pay for the current selection. 1 means right first time. */
  payAttempts: number;
}

export const emptyPayment: PaymentState = {
  selectedItemId: null,
  paidIndices: [],
  outcome: null,
  payAttempts: 0,
};

/**
 * The bakery shift in progress. Runtime only, never saved: leaving the bakery
 * mid-shift simply means starting the queue again next time. Nothing is lost,
 * because nothing is paid until the last customer has gone.
 *
 * Each customer goes through three phases:
 *   make   — she puts their order on the tray (and toppings on a bun), then
 *            rings the bell;
 *   change — they hand over coins and she counts change out of the till;
 *   thanks — they say thank you and drop 1p in the tip jar.
 *
 * `given` holds COIN VALUES, not purse indices. The till is the bakery's, not
 * hers — it has as many of each coin as she needs, and none of it is her money.
 */
export type ShiftPhase = 'make' | 'change' | 'thanks';

export interface ShiftState {
  /** 0..SHIFT_CUSTOMERS-1 while serving; SHIFT_CUSTOMERS once everyone is served. */
  customerIndex: number;
  phase: ShiftPhase;
  /** Item ids on the serving tray. */
  tray: string[];
  /** What she has put on the iced bun. */
  toppings: ToppingCounts;
  /** What the customer said when she last rang the bell, until she changes something. */
  orderReply: OrderCheck | null;
  /** Coins she has taken out of the till for the current customer. */
  given: CoinValue[];
  /** What the customer said when she last pressed Give, until she changes something. */
  reply: ChangeCheck | null;
  /** Presses of Give for this customer. After 2 misses the customer offers a hint. */
  tries: number;
}

export const freshShift: ShiftState = {
  customerIndex: 0,
  phase: 'make',
  tray: [],
  toppings: noToppings(),
  orderReply: null,
  given: [],
  reply: null,
  tries: 0,
};

export interface GameState {
  save: SaveData;
  screen: Screen;
  /** Where to return to when an overlay screen is closed. */
  previousScreen: Screen;
  payment: PaymentState;
  /** 0,1,2 are the three Saturday beats; 3 means the sequence is finished. */
  saturdayStep: number;
  shift: ShiftState;
}

/**
 * Has nothing happened yet in this save? Only then does the game open on the
 * Saturday sequence.
 *
 * This matters because `saturdayStep` is runtime-only and does not survive a
 * reload. The week's income is granted by `confirmBed`, atomically with the
 * week counter, and NEVER by the Saturday screen — so replaying the ceremony
 * is harmless, while tying the money to it would hand out a second week's
 * income on every refresh.
 */
export function isUntouched(save: SaveData): boolean {
  return (
    save.week === 1 &&
    save.transactionLog.length === 0 &&
    save.bag.length === 0 &&
    save.moneyBox.length === 0
  );
}

export function initialState(save: SaveData): GameState {
  return {
    save,
    screen: isUntouched(save) ? 'saturday' : 'street',
    previousScreen: 'street',
    payment: emptyPayment,
    saturdayStep: 0,
    shift: freshShift,
  };
}

export type GameAction =
  | { type: 'go'; screen: Screen }
  | { type: 'saturdayNext' }
  | { type: 'selectItem'; itemId: string }
  | { type: 'clearItem' }
  | { type: 'addCoin'; index: number }
  | { type: 'removeCoin'; index: number }
  | { type: 'clearPayment' }
  | { type: 'pay'; itemId: string; price: Pence; isFood: boolean; ts: number }
  | { type: 'dismissOutcome' }
  | { type: 'moveToMoneyBox'; index: number }
  | { type: 'moveToPurse'; index: number }
  | { type: 'setSavingGoal'; itemId: string | null }
  | { type: 'placeInBedroom'; itemId: string }
  | { type: 'removeFromBedroom'; itemId: string }
  | { type: 'goToBed' }
  | { type: 'confirmBed' }
  | { type: 'setStage'; stage: Stage }
  | { type: 'importSave'; data: SaveData }
  | { type: 'resetGame' }
  | { type: 'trayAdd'; itemId: string }
  | { type: 'trayRemove'; position: number }
  | { type: 'toppingAdd'; topping: Topping }
  | { type: 'toppingRemove'; topping: Topping }
  | { type: 'serve' }
  | { type: 'tillAdd'; coin: CoinValue }
  | { type: 'tillRemove'; position: number }
  | { type: 'tillClear' }
  | { type: 'giveChange' }
  | { type: 'nextCustomer' }
  | { type: 'collectWages' };

/** The electricity top-up is paid for like anything else, using the same UI. */
export const ELECTRICITY_ITEM_ID = 'electricity';

function isStageGated(itemId: string, stage: Stage): boolean {
  const required = STAGE_GATED_ITEMS[itemId];
  return required !== undefined && stage < required;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'go': {
      if (action.screen === state.screen) return state;
      // Leaving a shop abandons any half-built payment. No coins are lost,
      // because coins in the payment area never left the purse.
      const leavingShop = !isShopScreen(action.screen);
      return {
        ...state,
        screen: action.screen,
        previousScreen:
          state.screen === 'purse' || state.screen === 'parent'
            ? state.previousScreen
            : state.screen,
        payment: leavingShop ? emptyPayment : state.payment,
        // Walking in to work always starts at the front of the queue.
        shift: action.screen === 'shift' ? freshShift : state.shift,
      };
    }

    case 'saturdayNext': {
      const step = state.saturdayStep + 1;
      if (step >= 3) return { ...state, saturdayStep: 3, screen: 'street' };
      return { ...state, saturdayStep: step };
    }

    case 'selectItem':
      return { ...state, payment: { ...emptyPayment, selectedItemId: action.itemId } };

    case 'clearItem':
      return { ...state, payment: emptyPayment };

    case 'addCoin': {
      if (state.payment.paidIndices.includes(action.index)) return state;
      if (action.index < 0 || action.index >= state.save.purse.length) return state;
      return {
        ...state,
        payment: {
          ...state.payment,
          paidIndices: [...state.payment.paidIndices, action.index],
          outcome: null,
        },
      };
    }

    case 'removeCoin':
      return {
        ...state,
        payment: {
          ...state.payment,
          paidIndices: state.payment.paidIndices.filter((i) => i !== action.index),
          outcome: null,
        },
      };

    case 'clearPayment':
      return { ...state, payment: { ...state.payment, paidIndices: [], outcome: null } };

    case 'pay':
      return applyPayment(state, action);

    case 'dismissOutcome':
      return { ...state, payment: { ...state.payment, outcome: null } };

    case 'moveToMoneyBox': {
      const coin = state.save.purse[action.index];
      if (coin === undefined) return state;
      return {
        ...state,
        payment: emptyPayment,
        save: {
          ...state.save,
          purse: state.save.purse.filter((_, i) => i !== action.index),
          moneyBox: [...state.save.moneyBox, coin],
        },
      };
    }

    case 'moveToPurse': {
      const coin = state.save.moneyBox[action.index];
      if (coin === undefined) return state;
      return {
        ...state,
        payment: emptyPayment,
        save: {
          ...state.save,
          moneyBox: state.save.moneyBox.filter((_, i) => i !== action.index),
          purse: [...state.save.purse, coin],
        },
      };
    }

    case 'setSavingGoal':
      return { ...state, save: { ...state.save, savingGoal: action.itemId } };

    case 'placeInBedroom': {
      if (state.save.bedroom.includes(action.itemId)) return state;
      // Only things she owns, and only things that are not food.
      const owned = state.save.bag.some((b) => b.itemId === action.itemId);
      const item = itemById(action.itemId);
      if (!owned || item === undefined || item.isFood) return state;
      return { ...state, save: { ...state.save, bedroom: [...state.save.bedroom, action.itemId] } };
    }

    case 'removeFromBedroom':
      return {
        ...state,
        save: {
          ...state.save,
          bedroom: state.save.bedroom.filter((id) => id !== action.itemId),
        },
      };

    case 'goToBed':
      return { ...state, screen: 'weekSummary' };

    case 'confirmBed': {
      // The week's income is granted HERE, atomically with the week counter,
      // so it is impossible to collect twice by reloading.
      const advanced = nextWeek(state.save);
      return {
        ...state,
        save: { ...advanced, purse: [...advanced.purse, ...incomeCoins(advanced.stage)] },
        screen: 'saturday',
        saturdayStep: 0,
        payment: emptyPayment,
      };
    }

    case 'setStage':
      // Manual override from the grown-ups' screen only.
      return { ...state, save: { ...state.save, stage: action.stage } };

    case 'importSave':
      return { ...initialState(action.data), screen: 'street', saturdayStep: 3 };

    case 'resetGame':
      return initialState(brandNewSave());

    case 'trayAdd':
    case 'trayRemove':
    case 'toppingAdd':
    case 'toppingRemove':
    case 'serve':
    case 'tillAdd':
    case 'tillRemove':
    case 'tillClear':
    case 'giveChange':
    case 'nextCustomer':
    case 'collectWages':
      return shiftReducer(state, action);

    default:
      return state;
  }
}

function applyPayment(
  state: GameState,
  action: Extract<GameAction, { type: 'pay' }>,
): GameState {
  const { purse, stage } = state.save;
  const offered = state.payment.paidIndices
    .map((i) => purse[i])
    .filter((c): c is CoinValue => c !== undefined);
  if (offered.length === 0) return state;
  if (isStageGated(action.itemId, stage)) return state;

  const attempts = state.payment.payAttempts + 1;
  const result = checkPayment(action.price, offered, stage);

  if (result.kind === 'short') {
    // Nothing is deducted. Coins stay exactly where she put them. The shortfall
    // is recorded only for the grown-ups' view — she is never shown it.
    const coinErrors = { ...state.save.coinErrors };
    for (const coin of offered) coinErrors[coin] += 1;
    return {
      ...state,
      save: { ...state.save, coinErrors },
      payment: {
        ...state.payment,
        payAttempts: attempts,
        outcome: { kind: 'short', shortBy: result.shortBy },
      },
    };
  }

  // Exact or over: the offered coins leave the purse, any change comes back.
  const spent = new Set(state.payment.paidIndices);
  const remaining = purse.filter((_, i) => !spent.has(i));
  const changeCoins = result.kind === 'over' ? result.changeCoins : [];

  const isElectricity = action.itemId === ELECTRICITY_ITEM_ID;

  const transactionLog = [
    ...state.save.transactionLog,
    { price: action.price, attempts, ts: action.ts, stage },
  ];

  let save: SaveData = {
    ...state.save,
    purse: [...remaining, ...changeCoins],
    transactionLog,
  };

  if (isElectricity) {
    save = { ...save, electricityDays: 7 };
  } else {
    save = {
      ...save,
      bag: [...save.bag, { itemId: action.itemId, boughtWeek: save.week }],
      foodMeter: action.isFood
        ? (Math.min(FOOD_METER_MAX, save.foodMeter + 1) as FoodMeter)
        : save.foodMeter,
    };
  }

  // Stage progression is earned only through the §8 rule — never through time
  // played, money spent or items owned, and it never regresses.
  if (shouldAdvanceStage(transactionLog, save.stage)) {
    save = { ...save, stage: nextStage(save.stage) };
  }

  const outcome: Outcome =
    result.kind === 'over'
      ? { kind: 'over', itemId: action.itemId, changeCoins }
      : { kind: 'exact', itemId: action.itemId };

  return { ...state, save, payment: { ...emptyPayment, outcome } };
}

/* ---------------------------------------------------------------------------
 * The bakery shift
 * ------------------------------------------------------------------------- */

type ShiftAction = Extract<
  GameAction,
  {
    type:
      | 'trayAdd'
      | 'trayRemove'
      | 'toppingAdd'
      | 'toppingRemove'
      | 'serve'
      | 'tillAdd'
      | 'tillRemove'
      | 'tillClear'
      | 'giveChange'
      | 'nextCustomer'
      | 'collectWages';
  }
>;

/** The customer she is serving now, or null once the queue is empty. */
export function currentCustomer(state: GameState) {
  return shiftCustomers(state.save.week, state.save.stage)[state.shift.customerIndex] ?? null;
}

export function shiftFinished(state: GameState): boolean {
  return state.shift.customerIndex >= SHIFT_CUSTOMERS;
}

/** Pennies in the tip jar so far: one from every customer who has said thank you. */
export function tipsSoFar(state: GameState): number {
  return state.shift.customerIndex + (state.shift.phase === 'thanks' ? 1 : 0);
}

/** Most toppings that fit on one bun. Enough for any order, not endless. */
const BUN_TOPPING_LIMIT = 12;
/** Most things on one tray. */
const TRAY_LIMIT = 4;

function shiftReducer(state: GameState, action: ShiftAction): GameState {
  const { shift, save } = state;
  // Once this week's shift is worked, the bakery has no more work for her.
  const worked = hasWorkedThisWeek(save.shiftWeek, save.week);
  const serving = !worked && !shiftFinished(state);
  const making = serving && shift.phase === 'make';
  const changing = serving && shift.phase === 'change';
  const withShift = (patch: Partial<ShiftState>): GameState => ({
    ...state,
    shift: { ...shift, ...patch },
  });

  switch (action.type) {
    case 'trayAdd':
      if (!making || shift.tray.length >= TRAY_LIMIT) return state;
      return withShift({ tray: [...shift.tray, action.itemId], orderReply: null });

    case 'trayRemove': {
      if (!making) return state;
      const tray = shift.tray.filter((_, i) => i !== action.position);
      // Taking the bun off the tray takes its toppings with it.
      const toppings = tray.includes('iced_bun') ? shift.toppings : noToppings();
      return withShift({ tray, toppings, orderReply: null });
    }

    case 'toppingAdd': {
      if (!making || !shift.tray.includes('iced_bun')) return state;
      const on = shift.toppings.cherry + shift.toppings.button;
      if (on >= BUN_TOPPING_LIMIT) return state;
      return withShift({
        toppings: { ...shift.toppings, [action.topping]: shift.toppings[action.topping] + 1 },
        orderReply: null,
      });
    }

    case 'toppingRemove': {
      if (!making || shift.toppings[action.topping] === 0) return state;
      return withShift({
        toppings: { ...shift.toppings, [action.topping]: shift.toppings[action.topping] - 1 },
        orderReply: null,
      });
    }

    case 'serve': {
      const customer = currentCustomer(state);
      if (!making || customer === null || shift.tray.length === 0) return state;
      const orderReply = checkOrder(shift.tray, shift.toppings, customer);
      // A wrong order moves nothing: the tray stays as it is, so she can fix it.
      return withShift({ orderReply, phase: orderReply.kind === 'right' ? 'change' : 'make' });
    }

    case 'tillAdd':
      if (!changing) return state;
      return withShift({ given: [...shift.given, action.coin], reply: null });

    case 'tillRemove':
      if (!changing) return state;
      return withShift({ given: shift.given.filter((_, i) => i !== action.position), reply: null });

    case 'tillClear':
      if (!changing) return state;
      return withShift({ given: [], reply: null });

    case 'giveChange': {
      const customer = currentCustomer(state);
      if (!changing || customer === null) return state;
      // A wrong amount moves nothing. The coins stay on the counter where she
      // put them, so she can add one or take one back.
      const reply = checkChange(shift.given, customer.changeDue);
      return withShift({
        reply,
        tries: shift.tries + 1,
        phase: reply.kind === 'right' ? 'thanks' : 'change',
      });
    }

    case 'nextCustomer':
      if (!serving || shift.phase !== 'thanks') return state;
      return { ...state, shift: { ...freshShift, customerIndex: shift.customerIndex + 1 } };

    case 'collectWages':
      // Paid in the same step that marks the week as worked, so it is
      // impossible to be paid twice — by a double tap or by a reload.
      if (worked || !shiftFinished(state)) return state;
      return {
        ...state,
        save: { ...save, purse: [...save.purse, ...wageCoins(save.stage)], shiftWeek: save.week },
      };

    default:
      return state;
  }
}

/* ---------------------------------------------------------------------------
 * Selectors
 * ------------------------------------------------------------------------- */

export function isShopScreen(screen: Screen): screen is ShopScreen {
  return (
    screen === 'bakery' ||
    screen === 'greengrocer' ||
    screen === 'toyshop' ||
    screen === 'charity'
  );
}

/** Total of the coins currently in the payment area. */
export function paymentTotal(state: GameState): Pence {
  const coins = state.payment.paidIndices
    .map((i) => state.save.purse[i])
    .filter((c): c is CoinValue => c !== undefined);
  return totalOf(coins);
}

export function purseTotal(save: SaveData): Pence {
  return totalOf(save.purse);
}

export function moneyBoxTotal(save: SaveData): Pence {
  return totalOf(save.moneyBox);
}

/** Everything she owns, purse and money box together. */
export function allMoneyTotal(save: SaveData): Pence {
  return purseTotal(save) + moneyBoxTotal(save);
}

/**
 * What she has spent since this week's coins arrived.
 *
 * Derived rather than stored: every purchase this week is in the bag with its
 * week stamped on it, and the electricity top-up is the one purchase that
 * isn't. That keeps the save schema exactly as specified.
 */
export function spentThisWeek(save: SaveData): Pence {
  let total = 0;
  for (const entry of save.bag) {
    if (entry.boughtWeek !== save.week) continue;
    const item = itemById(entry.itemId);
    if (item !== undefined) total += item.price;
  }
  if (save.electricityDays > 0) total += ELECTRICITY_WEEKLY;
  return total;
}

/** What she earned at the bakery this week: a full shift's wages, or nothing. */
export function earnedThisWeek(save: SaveData): Pence {
  return hasWorkedThisWeek(save.shiftWeek, save.week) ? shiftPay() : 0;
}

/**
 * What she had once this week's pocket money landed, before any wages. Pocket
 * money arrives at the start of the week and wages arrive mid-week, so this is
 * what is left, plus what has gone, minus what she earned.
 */
export function weekStartTotal(save: SaveData): Pence {
  return allMoneyTotal(save) + spentThisWeek(save) - earnedThisWeek(save);
}

/** This week's pocket money. Anything more, she earns at the bakery. */
export function weeklyIncome(): Pence {
  return POCKET_MONEY;
}

/**
 * This week's pocket money as actual coins, in the denominations available at
 * her stage. The Saturday screen shows exactly these landing in her purse.
 */
export function incomeCoins(stage: Stage): CoinValue[] {
  return minimumCoins(POCKET_MONEY, stage);
}
