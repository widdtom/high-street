import { describe, expect, it } from 'vitest';
import {
  gameReducer,
  initialState,
  paymentTotal,
  type GameState,
} from '../../src/state/gameReducer';
import { freshSave, type SaveData } from '../../src/state/save';
import type { CoinValue } from '../../src/engine/types';

function stateWithPurse(purse: CoinValue[], stage: SaveData['stage'] = 1): GameState {
  return initialState({ ...freshSave(), purse, stage });
}

function place(state: GameState, indices: number[]): GameState {
  return indices.reduce((s, index) => gameReducer(s, { type: 'addCoin', index }), state);
}

describe('gameReducer payment', () => {
  it('pays exactly: coins leave the purse and the item goes in the bag', () => {
    let state = stateWithPurse([10, 2, 1, 5]);
    state = gameReducer(state, { type: 'selectItem', itemId: 'loaf' });
    state = place(state, [0, 1]); // 10p + 2p = 12p
    expect(paymentTotal(state)).toBe(12);

    state = gameReducer(state, { type: 'pay', itemId: 'loaf', price: 12, ts: 1 });
    expect(state.bakery.outcome).toEqual({ kind: 'exact', itemId: 'loaf' });
    expect(state.save.purse).toEqual([1, 5]);
    expect(state.bag).toEqual(['loaf']);
    expect(state.save.transactionLog).toEqual([{ price: 12, correct: true, ts: 1 }]);
  });

  it('short payment costs nothing: no coins move, no deduction', () => {
    let state = stateWithPurse([10, 2, 1, 5]);
    const purseBefore = [...state.save.purse];
    state = gameReducer(state, { type: 'selectItem', itemId: 'loaf' });
    state = place(state, [1]); // 2p against a 12p loaf

    state = gameReducer(state, { type: 'pay', itemId: 'loaf', price: 12, ts: 1 });
    expect(state.bakery.outcome).toEqual({ kind: 'short', shortBy: 10 });
    expect(state.save.purse).toEqual(purseBefore);
    expect(state.bag).toEqual([]);
    // Coins stay exactly where she put them.
    expect(state.bakery.paidIndices).toEqual([1]);
    expect(state.bakery.selectedItemId).toBe('loaf');
  });

  it('records the coins involved in a short payment for the grown-ups only', () => {
    let state = stateWithPurse([2, 2, 10]);
    state = gameReducer(state, { type: 'selectItem', itemId: 'loaf' });
    state = place(state, [0, 1]);
    state = gameReducer(state, { type: 'pay', itemId: 'loaf', price: 12, ts: 1 });
    expect(state.save.coinErrors[2]).toBe(2);
    expect(state.save.coinErrors[10]).toBe(0);
  });

  it('overpaying returns change coins into the purse', () => {
    let state = stateWithPurse([10, 10, 1], 1);
    state = gameReducer(state, { type: 'selectItem', itemId: 'iced_bun' });
    state = place(state, [0]); // 10p for a 9p bun

    state = gameReducer(state, { type: 'pay', itemId: 'iced_bun', price: 9, ts: 2 });
    expect(state.bakery.outcome?.kind).toBe('over');
    if (state.bakery.outcome?.kind !== 'over') return;
    const change = state.bakery.outcome.changeCoins;
    expect(change.reduce<number>((a, b) => a + b, 0)).toBe(1);
    // Purse: the 10p spent, the remaining coins kept, the change added.
    expect(state.save.purse.reduce<number>((a, b) => a + b, 0)).toBe(21 - 9);
  });

  it('will not pay with an empty payment area', () => {
    let state = stateWithPurse([10]);
    state = gameReducer(state, { type: 'selectItem', itemId: 'roll' });
    const before = state;
    state = gameReducer(state, { type: 'pay', itemId: 'roll', price: 5, ts: 1 });
    expect(state).toBe(before);
  });

  it('tapping a coin in the payment area returns it to the tray', () => {
    let state = stateWithPurse([10, 5]);
    state = place(state, [0, 1]);
    expect(paymentTotal(state)).toBe(15);
    state = gameReducer(state, { type: 'removeCoin', index: 0 });
    expect(paymentTotal(state)).toBe(5);
    expect(state.bakery.paidIndices).toEqual([1]);
  });

  it('does not place the same coin twice or place a coin that is not there', () => {
    let state = stateWithPurse([10, 5]);
    state = place(state, [0, 0, 9, -1]);
    expect(state.bakery.paidIndices).toEqual([0]);
  });

  it('leaving the bakery abandons the payment without losing coins', () => {
    let state = stateWithPurse([10, 5]);
    state = gameReducer(state, { type: 'go', screen: 'bakery' });
    state = gameReducer(state, { type: 'selectItem', itemId: 'roll' });
    state = place(state, [0, 1]);
    state = gameReducer(state, { type: 'go', screen: 'street' });
    expect(state.save.purse).toEqual([10, 5]);
    expect(state.bakery.paidIndices).toEqual([]);
  });

  it('the purse overlay returns to the screen it was opened from', () => {
    let state = stateWithPurse([10]);
    state = gameReducer(state, { type: 'go', screen: 'bakery' });
    state = gameReducer(state, { type: 'go', screen: 'purse' });
    expect(state.previousScreen).toBe('bakery');
  });

  it('every price in the game can be paid from a purse of pennies', () => {
    // No fail states means no dead ends: 1p exists, so nothing is unpayable.
    for (const price of [5, 8, 9, 12]) {
      let state = stateWithPurse(Array.from({ length: price }, () => 1 as CoinValue));
      state = gameReducer(state, { type: 'selectItem', itemId: 'x' });
      state = place(
        state,
        Array.from({ length: price }, (_, i) => i),
      );
      state = gameReducer(state, { type: 'pay', itemId: 'x', price, ts: 1 });
      expect(state.bakery.outcome).toEqual({ kind: 'exact', itemId: 'x' });
      expect(state.save.purse).toEqual([]);
    }
  });

  it('importing a save replaces the game state', () => {
    let state = stateWithPurse([10]);
    const incoming = { ...freshSave(), purse: [50, 50] as CoinValue[], stage: 3 as const };
    state = gameReducer(state, { type: 'importSave', data: incoming });
    expect(state.save.purse).toEqual([50, 50]);
    expect(state.save.stage).toBe(3);
  });

  it('never produces a non-integer amount', () => {
    let state = stateWithPurse([10, 5, 2, 1]);
    state = place(state, [0, 1, 2, 3]);
    expect(Number.isInteger(paymentTotal(state))).toBe(true);
    state = gameReducer(state, { type: 'pay', itemId: 'roll', price: 5, ts: 1 });
    for (const coin of state.save.purse) expect(Number.isInteger(coin)).toBe(true);
  });
});
