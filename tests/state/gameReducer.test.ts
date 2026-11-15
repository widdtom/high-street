import { describe, expect, it } from 'vitest';
import {
  ELECTRICITY_ITEM_ID,
  allMoneyTotal,
  currentCustomer,
  earnedThisWeek,
  freshShift,
  shiftFinished,
  gameReducer,
  initialState,
  moneyBoxTotal,
  paymentTotal,
  purseTotal,
  spentThisWeek,
  weekStartTotal,
  type GameState,
} from '../../src/state/gameReducer';
import { freshSave, type SaveData } from '../../src/state/saveTypes';
import type { CoinValue, Stage } from '../../src/engine/types';
import { minimumCoins } from '../../src/engine';
import { SHIFT_CUSTOMERS } from '../../src/data/economy';

function stateWith(patch: Partial<SaveData>): GameState {
  const base = initialState({ ...freshSave(), ...patch });
  // Skip the Saturday sequence for tests that aren't about it.
  return { ...base, screen: 'street', saturdayStep: 3 };
}

function place(state: GameState, indices: number[]): GameState {
  return indices.reduce((s, index) => gameReducer(s, { type: 'addCoin', index }), state);
}

const buy = (
  state: GameState,
  itemId: string,
  price: number,
  isFood: boolean,
  ts = 1,
): GameState => gameReducer(state, { type: 'pay', itemId, price, isFood, ts });

describe('paying', () => {
  it('exact payment: coins leave the purse, the item goes in the bag', () => {
    let s = stateWith({ purse: [10, 2, 1, 5] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'loaf' });
    s = place(s, [0, 1]); // 12p
    expect(paymentTotal(s)).toBe(12);

    s = buy(s, 'loaf', 12, true);
    expect(s.payment.outcome).toEqual({ kind: 'exact', itemId: 'loaf' });
    expect(s.save.purse).toEqual([1, 5]);
    expect(s.save.bag).toEqual([{ itemId: 'loaf', boughtWeek: 1 }]);
  });

  it('logs attempts, not a boolean, and counts presses of Pay', () => {
    let s = stateWith({ purse: [10, 2] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'loaf' });
    s = place(s, [1]); // 2p against 12p — short
    s = buy(s, 'loaf', 12, true);
    expect(s.save.transactionLog).toEqual([]); // a short payment is not a purchase

    s = place(s, [0]); // add the 10p
    s = buy(s, 'loaf', 12, true, 99);
    expect(s.save.transactionLog).toEqual([{ price: 12, attempts: 2, ts: 99, stage: 1 }]);
  });

  it('right first time logs one attempt', () => {
    let s = stateWith({ purse: [5] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'roll' });
    s = place(s, [0]);
    s = buy(s, 'roll', 5, true);
    expect(s.save.transactionLog[0]?.attempts).toBe(1);
  });

  it('a short payment costs nothing and moves no coins', () => {
    let s = stateWith({ purse: [10, 2, 1, 5] });
    const before = [...s.save.purse];
    s = gameReducer(s, { type: 'selectItem', itemId: 'loaf' });
    s = place(s, [1]);
    s = buy(s, 'loaf', 12, true);

    expect(s.payment.outcome).toEqual({ kind: 'short', shortBy: 10 });
    expect(s.save.purse).toEqual(before);
    expect(s.save.bag).toEqual([]);
    expect(s.save.foodMeter).toBe(0);
    expect(s.payment.paidIndices).toEqual([1]); // coins stay put
    expect(s.payment.selectedItemId).toBe('loaf');
  });

  it('records which coins were in a short payment, for the grown-ups only', () => {
    let s = stateWith({ purse: [2, 2, 10] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'loaf' });
    s = place(s, [0, 1]);
    s = buy(s, 'loaf', 12, true);
    expect(s.save.coinErrors[2]).toBe(2);
    expect(s.save.coinErrors[10]).toBe(0);
  });

  it('overpaying returns change into the purse', () => {
    let s = stateWith({ purse: [10, 10, 1] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'iced_bun' });
    s = place(s, [0]); // 10p for a 9p bun
    s = buy(s, 'iced_bun', 9, true);

    expect(s.payment.outcome?.kind).toBe('over');
    expect(purseTotal(s.save)).toBe(21 - 9);
  });

  it('the case the game is built around: right money, wrong coins', () => {
    // 20p in hand, a 15p bag of potatoes. Affordable, not payable exactly.
    let s = stateWith({ purse: [20], stage: 2 });
    s = gameReducer(s, { type: 'selectItem', itemId: 'potatoes' });
    s = place(s, [0]);
    s = buy(s, 'potatoes', 15, true);
    expect(s.payment.outcome?.kind).toBe('over');
    expect(purseTotal(s.save)).toBe(5);
    expect(s.save.bag.map((b) => b.itemId)).toEqual(['potatoes']);
  });

  it('will not pay with an empty payment area', () => {
    let s = stateWith({ purse: [10] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'roll' });
    const before = s;
    expect(buy(s, 'roll', 5, true)).toBe(before);
  });
});

describe('the meters', () => {
  it('a food purchase fills one segment and stops at 3', () => {
    let s = stateWith({ purse: [1, 1, 1, 1] });
    for (let i = 0; i < 4; i += 1) {
      s = gameReducer(s, { type: 'selectItem', itemId: 'banana' });
      s = place(s, [0]);
      s = buy(s, 'banana', 1, true, i);
      s = { ...s, save: { ...s.save, purse: [1, 1, 1, 1].slice(0, 3 - i) as CoinValue[] } };
    }
    expect(s.save.foodMeter).toBe(3);
  });

  it('a non-food purchase does not fill the food meter', () => {
    let s = stateWith({ purse: [10] });
    s = gameReducer(s, { type: 'selectItem', itemId: 'stickers' });
    s = place(s, [0]);
    s = buy(s, 'stickers', 10, false);
    expect(s.save.foodMeter).toBe(0);
    expect(s.save.bag.map((b) => b.itemId)).toEqual(['stickers']);
  });

  it('the electricity top-up turns the lights on and is not a bag item', () => {
    let s = stateWith({ purse: [10] });
    s = gameReducer(s, { type: 'selectItem', itemId: ELECTRICITY_ITEM_ID });
    s = place(s, [0]);
    s = buy(s, ELECTRICITY_ITEM_ID, 10, false);
    expect(s.save.electricityDays).toBe(7);
    expect(s.save.bag).toEqual([]);
    expect(s.save.bedroom).toEqual([]);
  });
});

describe('the money box', () => {
  it('moves coins both ways and never changes the total', () => {
    let s = stateWith({ purse: [10, 5, 2] });
    const total = allMoneyTotal(s.save);

    s = gameReducer(s, { type: 'moveToMoneyBox', index: 0 });
    expect(s.save.purse).toEqual([5, 2]);
    expect(s.save.moneyBox).toEqual([10]);
    expect(allMoneyTotal(s.save)).toBe(total);

    s = gameReducer(s, { type: 'moveToPurse', index: 0 });
    expect(s.save.moneyBox).toEqual([]);
    expect(purseTotal(s.save)).toBe(total);
    expect(allMoneyTotal(s.save)).toBe(total);
  });

  it('ignores an index that is not there', () => {
    const s = stateWith({ purse: [10] });
    expect(gameReducer(s, { type: 'moveToMoneyBox', index: 7 })).toBe(s);
    expect(gameReducer(s, { type: 'moveToPurse', index: 0 })).toBe(s);
  });

  it('there is no lock, no penalty and no interest', () => {
    let s = stateWith({ purse: [10, 10] });
    s = gameReducer(s, { type: 'moveToMoneyBox', index: 0 });
    s = gameReducer(s, { type: 'moveToMoneyBox', index: 0 });
    expect(moneyBoxTotal(s.save)).toBe(20);
    s = gameReducer(s, { type: 'moveToPurse', index: 0 });
    s = gameReducer(s, { type: 'moveToPurse', index: 0 });
    expect(moneyBoxTotal(s.save)).toBe(0);
    expect(purseTotal(s.save)).toBe(20);
  });
});

describe('the bedroom shelf', () => {
  it('only accepts things she owns that are not food', () => {
    let s = stateWith({
      bag: [
        { itemId: 'stickers', boughtWeek: 1 },
        { itemId: 'loaf', boughtWeek: 1 },
      ],
    });
    s = gameReducer(s, { type: 'placeInBedroom', itemId: 'stickers' });
    expect(s.save.bedroom).toEqual(['stickers']);

    s = gameReducer(s, { type: 'placeInBedroom', itemId: 'loaf' }); // food
    s = gameReducer(s, { type: 'placeInBedroom', itemId: 'scooter' }); // not owned
    expect(s.save.bedroom).toEqual(['stickers']);

    s = gameReducer(s, { type: 'removeFromBedroom', itemId: 'stickers' });
    expect(s.save.bedroom).toEqual([]);
  });
});

describe('the saving goal', () => {
  it('is set and cleared, and never auto-purchases', () => {
    let s = stateWith({ moneyBox: [100, 100] });
    s = gameReducer(s, { type: 'setSavingGoal', itemId: 'scooter' });
    expect(s.save.savingGoal).toBe('scooter');
    // Reaching the goal changes nothing on its own.
    expect(moneyBoxTotal(s.save)).toBe(200);
    expect(s.save.bag).toEqual([]);

    s = gameReducer(s, { type: 'setSavingGoal', itemId: null });
    expect(s.save.savingGoal).toBeNull();
  });
});

describe('stage gating', () => {
  it('the scooter cannot be bought before stage 4, at any price offered', () => {
    let s = stateWith({ purse: [100, 100], stage: 3 });
    s = gameReducer(s, { type: 'selectItem', itemId: 'scooter' });
    s = place(s, [0, 1]);
    const before = s;
    expect(buy(s, 'scooter', 200, false)).toBe(before);
  });

  it('and can be bought at stage 4', () => {
    let s = stateWith({ purse: [200], stage: 4 });
    s = gameReducer(s, { type: 'selectItem', itemId: 'scooter' });
    s = place(s, [0]);
    s = buy(s, 'scooter', 200, false);
    expect(s.save.bag.map((b) => b.itemId)).toEqual(['scooter']);
  });
});

describe('the week', () => {
  it('going to bed shows the summary before anything changes', () => {
    let s = stateWith({ foodMeter: 2, electricityDays: 7 });
    s = gameReducer(s, { type: 'goToBed' });
    expect(s.screen).toBe('weekSummary');
    expect(s.save.week).toBe(1);
    expect(s.save.foodMeter).toBe(2);
  });

  it('confirming advances the week and resets both meters', () => {
    let s = stateWith({ foodMeter: 3, electricityDays: 7, purse: [10], bedroom: ['stickers'] });
    s = gameReducer(s, { type: 'goToBed' });
    s = gameReducer(s, { type: 'confirmBed' });

    expect(s.save.week).toBe(2);
    expect(s.save.foodMeter).toBe(0);
    expect(s.save.electricityDays).toBe(0);
    // Nothing she owns is taken away, and the new week's income is added.
    expect(purseTotal(s.save)).toBe(10 + 30);
    expect(s.save.purse.slice(0, 1)).toEqual([10]);
    expect(s.save.bedroom).toEqual(['stickers']);
    expect(s.screen).toBe('saturday');
    expect(s.saturdayStep).toBe(0);
  });

  it('pays the week\'s income when the week turns, not when the ceremony plays', () => {
    // The Saturday screen is presentational. If income were tied to it, a
    // reload mid-ceremony would pay her twice.
    let s = stateWith({ purse: [], week: 1 });
    s = gameReducer(s, { type: 'goToBed' });
    s = gameReducer(s, { type: 'confirmBed' });
    expect(s.save.week).toBe(2);
    expect(purseTotal(s.save)).toBe(30); // 30p pocket money

    // Replaying the ceremony grants nothing.
    s = gameReducer(s, { type: 'saturdayNext' });
    s = gameReducer(s, { type: 'saturdayNext' });
    s = gameReducer(s, { type: 'saturdayNext' });
    expect(purseTotal(s.save)).toBe(30);
  });

  it('a fresh save already holds week 1\'s income, so a reload cannot re-grant it', () => {
    const a = initialState(freshSave());
    expect(purseTotal(a.save)).toBe(30);
    expect(a.screen).toBe('saturday');
    // Once anything has happened, the game no longer opens on Saturday.
    const b = initialState({ ...freshSave(), bag: [{ itemId: 'loaf', boughtWeek: 1 }] });
    expect(b.screen).toBe('street');
  });

  it('derives what she started the week with from what is left plus what went', () => {
    const s = stateWith({
      purse: [10, 5],
      moneyBox: [20],
      week: 2,
      electricityDays: 7,
      bag: [
        { itemId: 'loaf', boughtWeek: 2 }, // 12p, this week
        { itemId: 'stickers', boughtWeek: 1 }, // last week, ignored
      ],
    });
    expect(spentThisWeek(s.save)).toBe(12 + 10); // loaf + electricity
    expect(allMoneyTotal(s.save)).toBe(35);
    expect(weekStartTotal(s.save)).toBe(35 + 22);
  });
});

describe('stage progression', () => {
  it('advances only through the rule, after a purchase', () => {
    const log = Array.from({ length: 9 }, (_, i) => ({
      price: 5,
      attempts: 1,
      ts: i,
      stage: 1 as Stage,
    }));
    let s = stateWith({ purse: [5], transactionLog: log });
    expect(s.save.stage).toBe(1);

    s = gameReducer(s, { type: 'selectItem', itemId: 'roll' });
    s = place(s, [0]);
    s = buy(s, 'roll', 5, true, 100); // the 10th, all first-time
    expect(s.save.stage).toBe(2);
  });

  it('does not advance when too many took more than one press', () => {
    const log = Array.from({ length: 9 }, (_, i) => ({
      price: 5,
      attempts: i < 3 ? 2 : 1,
      ts: i,
      stage: 1 as Stage,
    }));
    let s = stateWith({ purse: [5], transactionLog: log });
    s = gameReducer(s, { type: 'selectItem', itemId: 'roll' });
    s = place(s, [0]);
    s = buy(s, 'roll', 5, true, 100);
    expect(s.save.stage).toBe(1);
  });

  it('the grown-ups can set the stage by hand', () => {
    let s = stateWith({});
    s = gameReducer(s, { type: 'setStage', stage: 4 });
    expect(s.save.stage).toBe(4);
    s = gameReducer(s, { type: 'setStage', stage: 1 });
    expect(s.save.stage).toBe(1);
  });
});

describe('navigation', () => {
  it('leaving a shop abandons the payment without losing coins', () => {
    let s = stateWith({ purse: [10, 5] });
    s = gameReducer(s, { type: 'go', screen: 'bakery' });
    s = gameReducer(s, { type: 'selectItem', itemId: 'roll' });
    s = place(s, [0, 1]);
    s = gameReducer(s, { type: 'go', screen: 'street' });
    expect(s.save.purse).toEqual([10, 5]);
    expect(s.payment.paidIndices).toEqual([]);
  });

  it('the purse overlay returns to the screen it was opened from', () => {
    let s = stateWith({});
    s = gameReducer(s, { type: 'go', screen: 'toyshop' });
    s = gameReducer(s, { type: 'go', screen: 'purse' });
    expect(s.previousScreen).toBe('toyshop');
  });

  it('never produces a non-integer amount', () => {
    let s = stateWith({ purse: [10, 5, 2, 1] });
    s = place(s, [0, 1, 2, 3]);
    expect(Number.isInteger(paymentTotal(s))).toBe(true);
    s = gameReducer(s, { type: 'selectItem', itemId: 'roll' });
    s = place(s, [0]);
    s = buy(s, 'roll', 5, true);
    for (const coin of s.save.purse) expect(Number.isInteger(coin)).toBe(true);
    for (const coin of s.save.moneyBox) expect(Number.isInteger(coin)).toBe(true);
  });
});

describe('the bakery shift', () => {
  const atWork = (patch: Partial<SaveData> = {}): GameState =>
    gameReducer(stateWith(patch), { type: 'go', screen: 'shift' });

  /** Make the order, then give the right change, for the current customer. */
  function serveRight(s: GameState): GameState {
    const c = currentCustomer(s);
    if (c === null) throw new Error('no customer');
    for (const id of c.itemIds) s = gameReducer(s, { type: 'trayAdd', itemId: id });
    if (c.toppings !== null) {
      for (let i = 0; i < c.toppings.count; i++) {
        s = gameReducer(s, { type: 'toppingAdd', topping: c.toppings.kind });
      }
    }
    s = gameReducer(s, { type: 'serve' });
    expect(s.shift.phase).toBe('change');
    for (const coin of minimumCoins(c.changeDue, s.save.stage)) {
      s = gameReducer(s, { type: 'tillAdd', coin });
    }
    s = gameReducer(s, { type: 'giveChange' });
    expect(s.shift.phase).toBe('thanks');
    return gameReducer(s, { type: 'nextCustomer' });
  }

  it('starts at the front of the queue, making the first order', () => {
    const s = atWork();
    expect(s.screen).toBe('shift');
    expect(s.shift).toEqual(freshShift);
    expect(currentCustomer(s)).not.toBeNull();
  });

  it('a wrong order moves nothing and costs nothing', () => {
    let s = atWork({ purse: [10] });
    s = gameReducer(s, { type: 'trayAdd', itemId: 'no_such_thing' });
    s = gameReducer(s, { type: 'serve' });
    expect(s.shift.phase).toBe('make');
    expect(s.shift.orderReply?.kind).not.toBe('right');
    expect(s.shift.tray).toEqual(['no_such_thing']);
    expect(s.save.purse).toEqual([10]);
  });

  it('cannot ring the bell with an empty tray', () => {
    const s = atWork();
    expect(gameReducer(s, { type: 'serve' })).toBe(s);
  });

  it('toppings need a bun, and go when the bun goes', () => {
    let s = atWork();
    expect(gameReducer(s, { type: 'toppingAdd', topping: 'cherry' }).shift.toppings.cherry).toBe(0);
    s = gameReducer(s, { type: 'trayAdd', itemId: 'iced_bun' });
    s = gameReducer(s, { type: 'toppingAdd', topping: 'cherry' });
    s = gameReducer(s, { type: 'toppingAdd', topping: 'cherry' });
    s = gameReducer(s, { type: 'toppingRemove', topping: 'cherry' });
    expect(s.shift.toppings.cherry).toBe(1);
    s = gameReducer(s, { type: 'trayRemove', position: 0 });
    expect(s.shift.toppings).toEqual({ cherry: 0, button: 0 });
  });

  it('wrong change keeps the coins on the counter and costs nothing', () => {
    let s = atWork({ purse: [5] });
    const c = currentCustomer(s);
    if (c === null) throw new Error('no customer');
    for (const id of c.itemIds) s = gameReducer(s, { type: 'trayAdd', itemId: id });
    if (c.toppings !== null) {
      for (let i = 0; i < c.toppings.count; i++) s = gameReducer(s, { type: 'toppingAdd', topping: c.toppings.kind });
    }
    s = gameReducer(s, { type: 'serve' });
    s = gameReducer(s, { type: 'tillAdd', coin: 10 });
    s = gameReducer(s, { type: 'tillAdd', coin: 10 });
    s = gameReducer(s, { type: 'giveChange' });
    expect(s.shift.phase).toBe('change');
    expect(s.shift.reply?.kind).toBe('over');
    expect(s.shift.given).toEqual([10, 10]);
    expect(s.save.purse).toEqual([5]);
  });

  it('pays wages plus the tip jar once, at the end, and only once a week', () => {
    let s = atWork({ purse: [] });
    for (let i = 0; i < SHIFT_CUSTOMERS; i++) {
      expect(s.save.purse).toEqual([]); // nothing is paid mid-shift
      s = serveRight(s);
    }
    expect(shiftFinished(s)).toBe(true);
    s = gameReducer(s, { type: 'collectWages' });
    expect(purseTotal(s.save)).toBe(25);
    expect(s.save.shiftWeek).toBe(1);
    expect(earnedThisWeek(s.save)).toBe(25);

    // A double tap pays nothing more.
    s = gameReducer(s, { type: 'collectWages' });
    expect(purseTotal(s.save)).toBe(25);

    // Walking back in this week: no more work to do.
    s = gameReducer(gameReducer(s, { type: 'go', screen: 'street' }), { type: 'go', screen: 'shift' });
    const before = s;
    s = gameReducer(s, { type: 'trayAdd', itemId: 'roll' });
    expect(s).toBe(before);

    // Wages do not count as money she started the week with.
    expect(weekStartTotal(s.save)).toBe(0);

    // Next week, the bakery needs her again.
    s = gameReducer(gameReducer(s, { type: 'goToBed' }), { type: 'confirmBed' });
    expect(earnedThisWeek(s.save)).toBe(0);
    s = gameReducer(s, { type: 'go', screen: 'shift' });
    expect(gameReducer(s, { type: 'trayAdd', itemId: 'roll' }).shift.tray).toEqual(['roll']);
  });
});
