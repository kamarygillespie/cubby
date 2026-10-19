import type { Item } from "@/lib/db/items";

export type SortOption = "interest_desc" | "price_desc" | "price_asc";

export type ItemFilters = {
  categoryId?: string | null;
  itemTypeId?: string | null;
  onSaleOnly?: boolean;
};

export function isOnSale(item: Item): boolean {
  return (
    item.sale_price !== null &&
    item.price !== null &&
    item.sale_price < item.price
  );
}

function effectivePrice(item: Item): number {
  return (isOnSale(item) ? item.sale_price : item.price) ?? 0;
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
