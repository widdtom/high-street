import ShopScreen from '../components/ShopScreen';
import { STAGE_GATED_ITEMS, TOYSHOP_ITEMS } from '../data/economy';
import type { ShopItem } from '../engine/types';
import { useGame } from '../state/GameContext';

/**
 * The toy shop. Nine things she might want, 10p to 200p.
 *
 * Every item carries a saving-goal star. The star is a BOOKMARK, not a reward:
 * it marks the thing she is saving up for and she can take it off again.
 *
 * The scooter costs 200p, which needs the £2 coin, so it is purchasable only at
 * stage 4. It stays in the window at every stage — priced, dimmed, padlocked
 * and still settable as a saving goal. It is never hidden: the whole point of a
 * saving goal is that it is visible long before it is affordable.
 */
export default function ToyshopScreen() {
  const { state } = useGame();
  const { stage } = state.save;

  const stageGate = (item: ShopItem): boolean => {
    const required = STAGE_GATED_ITEMS[item.id];
    return required !== undefined && stage < required;
  };

  return (
    <ShopScreen
      shopId="toyshop"
      title="Toy shop"
      accent="#4a90d9"
      items={TOYSHOP_ITEMS}
      cardWidth={144}
      artSize={80}
      columns={5}
      showGoalStar
      stageGate={stageGate}
    />
  );
}
