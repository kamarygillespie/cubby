import type { ReactNode } from "react";
import type { listItems } from "@/lib/db/items";
import { ItemCard } from "./item-card";

type Items = Awaited<ReturnType<typeof listItems>>;

// itemId → the wishlists it's on. Shown in each item's details so the same
// item isn't accidentally put on two people's lists (FEATURES.md, wishlist
// sharing).
export type ListsByItem = ReadonlyMap<string, { id: string; name: string }[]>;

export function ItemsList({
  items,
  listsByItem,
  failedPriceChecks,
  emptyState,
}: {
  items: Items;
  listsByItem?: ListsByItem;
  failedPriceChecks?: ReadonlySet<string>;
  emptyState?: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        {emptyState ?? "No items here."}
      </div>
    );
  }

  return (
    <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        // Lets the browser skip layout/paint for off-screen cards.
        <li
          key={item.id}
          className="[contain-intrinsic-size:auto_240px] [content-visibility:auto]"
        >
          <ItemCard
            item={item}
            lists={listsByItem?.get(item.id) ?? []}
            priceCheckFailed={failedPriceChecks?.has(item.id) ?? false}
          />
        </li>
      ))}
    </ul>
  );
}
