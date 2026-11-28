// Cost per wear in the closet (KAM-85). Pure, so it's unit-tested.
import { formatCurrency } from "@/lib/format";

export type WearSort = "most_worn" | "least_worn" | "best_value";

export const WEAR_SORTS: { value: WearSort; label: string }[] = [
  { value: "most_worn", label: "Most worn" },
  { value: "least_worn", label: "Least worn" },
  { value: "best_value", label: "Best cost per wear" },
];

export function parseWearSort(value: unknown): WearSort | null {
  return WEAR_SORTS.some((s) => s.value === value) ? (value as WearSort) : null;
}

// Price paid ÷ wears. Null without a price or before the first wear.
export function costPerWear(
  price: number | null,
  wears: number,
): number | null {
  if (price === null || price <= 0 || wears <= 0) return null;
  return Math.round((price / wears) * 100) / 100;
}

// "Worn 24× · $5.00/wear", "Worn once", "Not worn yet".
export function wearLabel(price: number | null, wears: number): string {
  if (wears === 0) return "Not worn yet";
  const count = wears === 1 ? "Worn once" : `Worn ${wears}×`;
  const cpw = costPerWear(price, wears);
  return cpw === null ? count : `${count} · ${formatCurrency(cpw)}/wear`;
}

// Best value = lowest cost per wear; pieces without one go last. Ties keep
// the incoming order (stable sort).
export function sortByWear<T extends { id: string; price: number | null }>(
  items: T[],
  wears: ReadonlyMap<string, number>,
  sort: WearSort | null,
): T[] {
  if (!sort) return items;
  const n = (item: T) => wears.get(item.id) ?? 0;
  return [...items].sort((a, b) => {
    if (sort === "most_worn") return n(b) - n(a);
    if (sort === "least_worn") return n(a) - n(b);
    const ca = costPerWear(a.price, n(a));
    const cb = costPerWear(b.price, n(b));
    if (ca === null || cb === null)
      return Number(ca === null) - Number(cb === null);
    return ca - cb;
  });
}
