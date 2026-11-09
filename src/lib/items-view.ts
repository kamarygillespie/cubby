import type { Item } from "@/lib/db/items";

export type SortOption = "interest_desc" | "price_desc" | "price_asc";

export type ItemFilters = {
  categoryId?: string | null;
  itemTypeId?: string | null;
  onSaleOnly?: boolean;
};

type Prices = Pick<Item, "price" | "sale_price">;

export function isOnSale(item: Prices): boolean {
  return (
    item.sale_price !== null &&
    item.price !== null &&
    item.sale_price < item.price
  );
}

export function effectivePrice(item: Prices): number {
  return (isOnSale(item) ? item.sale_price : item.price) ?? 0;
}

export type ItemView = "wishlist" | "purchased" | "gifted";

export function filterByView(items: Item[], view: ItemView): Item[] {
  switch (view) {
    case "purchased":
      return items.filter((item) => item.purchased);
    case "gifted":
      return items.filter((item) => item.gifted);
    case "wishlist":
    default:
      return items.filter((item) => !item.purchased && !item.gifted);
  }
}

export function filterItems(items: Item[], filters: ItemFilters): Item[] {
  return items.filter((item) => {
    if (
      filters.categoryId &&
      item.item_type.category.id !== filters.categoryId
    ) {
      return false;
    }
    if (filters.itemTypeId && item.item_type.id !== filters.itemTypeId) {
      return false;
    }
    if (filters.onSaleOnly && !isOnSale(item)) {
      return false;
    }
    return true;
  });
}

export function sortItems(items: Item[], sort: SortOption | null): Item[] {
  if (!sort) return items;

  const sorted = [...items];
  switch (sort) {
    case "interest_desc":
      sorted.sort((a, b) => (b.interest_level ?? 0) - (a.interest_level ?? 0));
      break;
    case "price_desc":
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    case "price_asc":
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
  }
  return sorted;
}

export type ItemGroup = {
  id: string;
  name: string;
  items: Item[];
  count: number;
  totalPrice: number;
};

function groupBy(
  items: Item[],
  keyOf: (item: Item) => { id: string; name: string },
): ItemGroup[] {
  const groups = new Map<string, ItemGroup>();

  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key.id) ?? {
      id: key.id,
      name: key.name,
      items: [],
      count: 0,
      totalPrice: 0,
    };
    group.items.push(item);
    group.count += 1;
    group.totalPrice += effectivePrice(item);
    groups.set(key.id, group);
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function groupByCategory(items: Item[]): ItemGroup[] {
  return groupBy(items, (item) => item.item_type.category);
}

export function groupByItemType(items: Item[]): ItemGroup[] {
  return groupBy(items, (item) => item.item_type);
}

export function activeWishlistItems(items: Item[]): Item[] {
  return items.filter((item) => !item.purchased && !item.gifted);
}

export function totalSpent(items: Item[]): number {
  return items
    .filter((item) => item.purchased)
    .reduce((sum, item) => sum + effectivePrice(item), 0);
}

export function totalWishlistValue(items: Item[]): number {
  return activeWishlistItems(items).reduce(
    (sum, item) => sum + effectivePrice(item),
    0,
  );
}

// Whole-percent discount for display ("-30%", not the stored "-30.47%").
// Null when not on sale or when it would round to 0%.
export function displayDiscountPercent(
  price: number | null,
  salePrice: number | null,
): number | null {
  if (price === null || salePrice === null || price <= 0) return null;
  if (salePrice >= price) return null;
  const percent = Math.round(((price - salePrice) / price) * 100);
  return percent >= 1 ? percent : null;
}

// The card's "Item type · Category · Store" line. The category is dropped
// when it just repeats the item type ("Technology · Technology").
export function itemMetaParts(item: Item): string[] {
  const type = item.item_type.name;
  const category = item.item_type.category.name;
  return [
    type,
    ...(category.toLowerCase() === type.toLowerCase() ? [] : [category]),
    ...(item.store_brand ? [item.store_brand] : []),
  ];
}

// How many item cards a page renders at first, and per "Show more". Totals,
// counts, filters and group sums always use every matching item; only the
// number of rendered cards is capped (KAM-45).
export const ITEMS_PAGE_SIZE = 50;

export function parseShowCount(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > ITEMS_PAGE_SIZE ? n : ITEMS_PAGE_SIZE;
}

// Caps the rendered cards across groups (in order) while keeping each
// group's full count/total, so headers stay truthful. Groups past the cap
// are dropped; `hidden` is how many cards weren't rendered.
export function limitGroups(
  groups: ItemGroup[],
  limit: number,
): { groups: ItemGroup[]; hidden: number } {
  let remaining = limit;
  let hidden = 0;
  const shown: ItemGroup[] = [];
  for (const group of groups) {
    if (remaining <= 0) {
      hidden += group.items.length;
      continue;
    }
    const items = group.items.slice(0, remaining);
    hidden += group.items.length - items.length;
    remaining -= items.length;
    shown.push({ ...group, items });
  }
  return { groups: shown, hidden };
}
