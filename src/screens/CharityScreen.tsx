import { useMemo } from 'react';
import PriceTag from '../components/PriceTag';
import ShopScreen, { type PriceRenderer } from '../components/ShopScreen';
import { CHARITY_ITEMS, CHARITY_STOCK_PER_WEEK } from '../data/economy';
import { formatMoney } from '../engine';
import type { Pence, ShopItem, Stage } from '../engine/types';
import { charityStockForWeek } from '../engine/week';
import { useGame } from '../state/GameContext';

/** What the same kind of thing costs new in the toy shop, by charity item id. */
const NEW_PRICE: Readonly<Record<string, Pence>> = Object.fromEntries(
  CHARITY_ITEMS.map((item) => [item.id, item.newPrice]),
);

/**
 * Both prices, together, always visible.
 *
 * The comparison IS the charity shop — hiding the new price behind a tap or a
 * second screen would remove the only thing this shop teaches. Numerals only,
 * never number words: the small "new" label names the other price, it never
 * spells out an amount.
 */
function DualPrice({ item, stage, large }: { item: ShopItem; stage: Stage; large: boolean }) {
  const newPrice = NEW_PRICE[item.id];

  if (newPrice === undefined) {
    return <PriceTag price={item.price} stage={stage} large={large} />;
  }

  return (
    <span
      className={[
        'flex items-center justify-center',
        large ? 'flex-col gap-1' : 'flex-row gap-2',
      ].join(' ')}
    >
      <PriceTag price={item.price} stage={stage} large={large} />
      <span className="flex flex-col items-center leading-none text-stone-500">
        <span className="text-[0.65rem] font-bold uppercase tracking-widest">new</span>
        <span
          data-testid="new-price"
          className={[
            'font-bold tabular-nums line-through decoration-2',
            large ? 'text-xl' : 'text-lg',
          ].join(' ')}
        >
          {formatMoney(newPrice, stage)}
        </span>
      </span>
    </span>
  );
}

/**
 * The charity shop. Three second-hand things, rotating weekly.
 *
 * The shelf is a pure function of the week number (charityStockForWeek), so the
 * same week shows the same shelf after a reload or on another device.
 *
 * Payment is the shared implementation in components/ShopScreen.tsx — nothing
 * about buying works differently here.
 */
export default function CharityScreen() {
  const { state } = useGame();
  const { week, stage } = state.save;

  const items = useMemo<readonly ShopItem[]>(() => {
    const ids = charityStockForWeek(week, CHARITY_STOCK_PER_WEEK);
    return ids
      .map((id) => CHARITY_ITEMS.find((item) => item.id === id))
      .filter((item): item is (typeof CHARITY_ITEMS)[number] => item !== undefined);
  }, [week]);

  const renderPrice: PriceRenderer = (item, { large }) => (
    <DualPrice item={item} stage={stage} large={large} />
  );

  return (
    <ShopScreen
      shopId="charity"
      title="Charity shop"
      accent="#9b6bb5"
      items={items}
      cardWidth={230}
      artSize={140}
      columns={3}
      renderPrice={renderPrice}
      itemTestId="charity-item"
    />
  );
}
