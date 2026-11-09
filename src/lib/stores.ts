// Store/brand helpers shared by gift card ideas (KAM-50) and favorite stores
// (KAM-49).
import { effectivePrice } from "@/lib/items-view";

// "  mejuri " and "Mejuri" are the same store.
export function storeKey(name: string | null | undefined): string | null {
  const trimmed = name?.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.toLowerCase() : null;
}

type PricedItem = {
  store_brand: string | null;
  price: number | null;
  sale_price: number | null;
};

export type GiftCardIdea = {
  store: string; // display name: the most common spelling
  itemCount: number;
  total: number;
};

// Gift card suggestions: stores ranked by how many of the given items they
// carry, then by total value, then name. Only stores with at least
// `minItems` items are suggested (one item isn't much of a gift card idea).
export function giftCardIdeas(
  items: PricedItem[],
  { minItems = 2 }: { minItems?: number } = {},
): GiftCardIdea[] {
  const byStore = new Map<
    string,
    { spellings: Map<string, number>; itemCount: number; total: number }
  >();
  for (const item of items) {
    const key = storeKey(item.store_brand);
    if (!key) continue;
    const entry = byStore.get(key) ?? {
      spellings: new Map(),
      itemCount: 0,
      total: 0,
    };
    const spelling = item.store_brand!.trim().replace(/\s+/g, " ");
    entry.spellings.set(spelling, (entry.spellings.get(spelling) ?? 0) + 1);
    entry.itemCount++;
    entry.total += effectivePrice(item);
    byStore.set(key, entry);
  }

  return [...byStore.values()]
    .filter((e) => e.itemCount >= minItems)
    .map((e) => ({
      store: [...e.spellings].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0][0],
      itemCount: e.itemCount,
      total: Math.round(e.total * 100) / 100,
    }))
    .sort(
      (a, b) =>
        b.itemCount - a.itemCount ||
        b.total - a.total ||
        a.store.localeCompare(b.store),
    );
}
