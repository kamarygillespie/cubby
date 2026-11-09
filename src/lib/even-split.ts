// Even-split list generator (KAM-53): spread items across N lists so each
// list's total is as close as possible.
//
// Greedy "largest first": sort by price, high to low, and give each item to
// the list with the lowest running total. Much tighter than plain
// round-robin by sorted price (the original FEATURES.md idea) and just as
// simple. Deterministic: ties break by list order, then item id. Items with
// no price go last, to the list with the fewest items.

export const SPLIT_MIN_LISTS = 2;
export const SPLIT_MAX_LISTS = 6;

export type SplitItem = { id: string; price: number | null };
export type SplitList = { itemIds: string[]; total: number; count: number };

export function splitEvenly(
  items: SplitItem[],
  listCount: number,
): SplitList[] {
  if (!Number.isInteger(listCount) || listCount < 1) {
    throw new Error("listCount must be a positive integer");
  }
  const lists: SplitList[] = Array.from({ length: listCount }, () => ({
    itemIds: [],
    total: 0,
    count: 0,
  }));
  const byId = (a: SplitItem, b: SplitItem) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const priced = items
    .filter((i) => i.price !== null && i.price > 0)
    .sort((a, b) => b.price! - a.price! || byId(a, b));
  const unpriced = items
    .filter((i) => !(i.price !== null && i.price > 0))
    .sort(byId);

  const pick = (key: (l: SplitList) => number) =>
    lists.reduce((best, l) => (key(l) < key(best) ? l : best), lists[0]);

  for (const item of priced) {
    const target = pick((l) => l.total);
    target.itemIds.push(item.id);
    target.total = Math.round((target.total + item.price!) * 100) / 100;
    target.count++;
  }
  for (const item of unpriced) {
    const target = pick((l) => l.count);
    target.itemIds.push(item.id);
    target.count++;
  }
  return lists;
}

// Largest gap between list totals: 0 is a perfect split.
export function splitSpread(lists: SplitList[]): number {
  const totals = lists.map((l) => l.total);
  return Math.round((Math.max(...totals) - Math.min(...totals)) * 100) / 100;
}
