import { Card, CardContent } from "@/components/ui/card";
import type { Item } from "@/lib/db/items";
import {
  activeWishlistItems,
  groupByCategory,
  groupByItemType,
  totalSpent,
  totalWishlistValue,
  type ItemGroup,
} from "@/lib/items-view";
import { formatCurrency } from "@/lib/format";
import { giftCardIdeas } from "@/lib/stores";
import { GiftCardIdeas } from "@/components/gift-card-ideas";
import { SpendingChart } from "./spending-chart";
import { effectivePrice } from "@/lib/items-view";
import { BuyNextCard, TasteCard } from "./recommendations-cards";
import { buyNext, tasteProfile, toRecItem } from "@/lib/recommendations";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownList({
  title,
  groups,
}: {
  title: string;
  groups: ItemGroup[];
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="flex flex-col gap-1">
        {groups.map((group) => (
          <li
            key={group.id}
            className="text-muted-foreground flex justify-between text-sm"
          >
            <span>
              {group.name} ({group.count})
            </span>
            <span>{formatCurrency(group.totalPrice)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TotalsDashboard({
  items,
  recentHighs,
}: {
  items: Item[];
  // Highest recent price per item, for "price dropped" picks (KAM-52).
  recentHighs: ReadonlyMap<string, number>;
}) {
  const active = activeWishlistItems(items);
  const purchased = items.filter((i) => i.purchased).map(toRecItem);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total spent"
          value={formatCurrency(totalSpent(items))}
        />
        <StatCard
          label="Wishlist value"
          value={formatCurrency(totalWishlistValue(items))}
        />
      </div>
      <SpendingChart
        purchases={items
          .filter((item) => item.purchased)
          .map((item) => ({
            id: item.id,
            title: item.title,
            date: item.purchased_date,
            amount: effectivePrice(item),
            category: item.item_type.category.name,
          }))}
      />
      <BuyNextCard
        picks={buyNext(active.map(toRecItem), purchased, recentHighs)}
      />
      <TasteCard taste={tasteProfile(purchased)} />
      <GiftCardIdeas
        ideas={giftCardIdeas(active)}
        description="Stores with several things on your wishlist: handy when someone asks what to get you."
      />
      <BreakdownList title="By category" groups={groupByCategory(active)} />
      <BreakdownList title="By item type" groups={groupByItemType(active)} />
    </div>
  );
}
