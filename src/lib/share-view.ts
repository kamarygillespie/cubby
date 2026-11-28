// How givers browse a shared list (KAM-80): a budget filter, price sort and
// a sensible default order. Pure, so it's unit-tested.

export const BUDGETS = [25, 50, 100] as const;
export type Budget = (typeof BUDGETS)[number] | null;
export type ShareSort = "suggested" | "price_asc" | "price_desc";

export type ShareViewItem = {
  price: number | null;
  sale_price: number | null;
  mostWanted: boolean;
  claimed: boolean; // someone else is getting it
};

const paid = (item: ShareViewItem) =>
  item.price !== null &&
  item.sale_price !== null &&
  item.sale_price < item.price
    ? item.sale_price
    : item.price;

// Claimed items always sink to the end. "Suggested" puts Most wanted first;
// otherwise the list's own order is kept (stable sort).
export function viewSharedItems<T extends ShareViewItem>(
  items: T[],
  budget: Budget,
  sort: ShareSort,
): T[] {
  const shown = budget
    ? items.filter((item) => {
        const price = paid(item);
        return price !== null && price <= budget;
      })
    : items;
  const byPrice = (a: T, b: T) => {
    const pa = paid(a);
    const pb = paid(b);
    // Unpriced items go last in either direction.
    if (pa === null || pb === null)
      return Number(pa === null) - Number(pb === null);
    return sort === "price_asc" ? pa - pb : pb - pa;
  };
  return [...shown].sort(
    (a, b) =>
      Number(a.claimed) - Number(b.claimed) ||
      (sort === "suggested"
        ? Number(b.mostWanted) - Number(a.mostWanted)
        : byPrice(a, b)),
  );
}
