/* =============================================================================
 * ENGINE BARREL
 * The whole money engine, in one import. Everything here is pure: no React, no
 * DOM, no I/O, no randomness. Money is INTEGER PENCE everywhere.
 * ============================================================================= */

export type {
  CoinColour,
  CoinShape,
  CoinSpec,
  CoinValue,
  Monarch,
  PaymentResult,
  Pence,
  ShopItem,
  Stage,
} from './types';

export {
  ALL_COIN_VALUES,
  COIN_SPEC_BY_VALUE,
  COIN_SPECS,
  MM_TO_PX,
  assertCoinValue,
  assertStage,
  coinDiameterPx,
  coinsForStage,
  isCoinValue,
  isStage,
} from './coins';

export {
  allCombinations,
  assertPence,
  canMakeExactly,
  canMakeExactlyFrom,
  formatMoney,
  minimumCoins,
  totalOf,
} from './money';

export { changeByCountingOn, checkPayment } from './change';
