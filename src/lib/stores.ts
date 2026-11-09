// Store/brand helpers shared by gift card ideas (KAM-50) and favorite stores
// (KAM-49).
import { displayDiscountPercent, effectivePrice } from "@/lib/items-view";

// "  mejuri " and "Mejuri" are the same store.
export function storeKey(name: string | null | undefined): string | null {
  const trimmed = name?.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.toLowerCase() : null;
}

// The display name for a store: its most common spelling. Ties prefer a
// capitalized spelling ("Mejuri" over "mejuri"), then alphabetical.
function pickSpelling(spellings: Map<string, number>): string {
  const capitalized = (name: string) => (name !== name.toLowerCase() ? 1 : 0);
  return [...spellings].sort(
    (a, b) =>
      b[1] - a[1] ||
      capitalized(b[0]) - capitalized(a[0]) ||
      a[0].localeCompare(b[0]),
  )[0][0];
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
      store: pickSpelling(e.spellings),
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

export type FavoriteStore = {
  store_key: string;
  display_name: string;
  sale_url: string | null;
};

export type StoreSummary = {
  key: string;
  name: string;
  favorite: boolean;
  saleUrl: string | null;
  itemCount: number;
  total: number;
  onSaleCount: number;
  bestDiscount: number | null; // whole percent
};

type StoreItem = PricedItem;

// One row per store across the given (active wishlist) items, merged with
// favorites. Favorites with no items still appear. Order: favorites first,
// then stores with something on sale, then by item count, then name.
export function summarizeStores(
  items: StoreItem[],
  favorites: FavoriteStore[],
): StoreSummary[] {
  const byKey = new Map<
    string,
    StoreSummary & { spellings: Map<string, number> }
  >();
  const ensure = (key: string) => {
    let row = byKey.get(key);
    if (!row) {
      row = {
        key,
        name: key,
        favorite: false,
        saleUrl: null,
        itemCount: 0,
        total: 0,
        onSaleCount: 0,
        bestDiscount: null,
        spellings: new Map(),
      };
      byKey.set(key, row);
    }
    return row;
  };

  for (const item of items) {
    const key = storeKey(item.store_brand);
    if (!key) continue;
    const row = ensure(key);
    const spelling = item.store_brand!.trim().replace(/\s+/g, " ");
    row.spellings.set(spelling, (row.spellings.get(spelling) ?? 0) + 1);
    row.itemCount++;
    row.total = Math.round((row.total + effectivePrice(item)) * 100) / 100;
    const discount = displayDiscountPercent(item.price, item.sale_price);
    if (discount !== null) {
      row.onSaleCount++;
      row.bestDiscount = Math.max(row.bestDiscount ?? 0, discount);
    }
  }
  for (const fav of favorites) {
    const row = ensure(fav.store_key);
    row.favorite = true;
    row.saleUrl = fav.sale_url;
    if (row.spellings.size === 0) row.spellings.set(fav.display_name, 1);
  }

  return [...byKey.values()]
    .map(({ spellings, ...row }) => ({
      ...row,
      name: pickSpelling(spellings),
    }))
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        Number(b.onSaleCount > 0) - Number(a.onSaleCount > 0) ||
        b.itemCount - a.itemCount ||
        a.name.localeCompare(b.name),
    );
}

// A sale page link must be a plain web URL.
export function parseSaleUrl(
  raw: string,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: true, url: null };
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return { ok: true, url: url.href };
    }
  } catch {
    // fall through
  }
  return { ok: false, error: "Enter a web address starting with https://" };
}
