import ShopScreen from '../components/ShopScreen';
import { GREENGROCER_ITEMS } from '../data/economy';

/**
 * The greengrocer. Nine things to eat, 2p to 25p.
 *
 * Nine cards will not fit across 1180px at bakery size, so the shelf wraps to
 * two rows of smaller cards rather than shrinking below a comfortable tap
 * target. The payment step is identical to every other shop's — one
 * implementation, in components/ShopScreen.tsx.
 */
export default function GreengrocerScreen() {
  return (
    <ShopScreen
      shopId="greengrocer"
      title="Greengrocer"
      accent="#6aa84f"
      items={GREENGROCER_ITEMS}
      cardWidth={144}
      artSize={80}
      columns={5}
    />
  );
}
