import ShopScreen from '../components/ShopScreen';
import { BAKERY_ITEMS } from '../data/economy';

/**
 * The bakery. Tap an item, tap coins to build a payment, tap Pay.
 *
 * Every shop in the game shares ONE payment implementation — see
 * components/ShopScreen.tsx. This file only says which shop it is.
 */
export default function BakeryScreen() {
  return <ShopScreen shopId="bakery" title="Bakery" accent="#e07a5f" items={BAKERY_ITEMS} />;
}
