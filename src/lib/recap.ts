// Year in Cubby (KAM-86): a recap of one year, from the account's own data.
// Pure, so it's unit-tested; the page runs it in the browser so the year
// follows the viewer's time zone.

export type RecapItem = {
  title: string;
  createdAt: string;
  purchasedAt: string | null;
  purchased: boolean;
  gifted: boolean;
  price: number | null;
  salePrice: number | null;
  interest: number | null;
  store: string | null;
  category: string;
};

export type Recap = {
  year: number;
  added: number;
  bought: number;
  spent: number;
  saved: number;
  topStore: { name: string; count: number } | null;
  topCategory: { name: string; count: number } | null;
  cameTrue: { title: string; interest: number } | null;
  mostWorn: { title: string; wears: number } | null;
};

const localYear = (iso: string) => new Date(iso).getFullYear();
const round2 = (n: number) => Math.round(n * 100) / 100;
const onSale = (i: RecapItem) =>
  i.price !== null && i.salePrice !== null && i.salePrice < i.price;

function top(
  values: (string | null)[],
): { name: string; count: number } | null {
  const counts = new Map<string, { name: string; count: number }>();
  for (const value of values) {
    const name = value?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = counts.get(key) ?? { name, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return (
    [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    )[0] ?? null
  );
}

export function yearRecap(
  items: RecapItem[],
  // Wears this year, by piece title (KAM-85).
  wears: { title: string; wears: number }[],
  year: number,
  yearOf: (iso: string) => number = localYear,
): Recap {
  const added = items.filter((i) => yearOf(i.createdAt) === year);
  // Bought this year, for yourself or as a gift for someone.
  const bought = items.filter(
    (i) => i.purchased && i.purchasedAt && yearOf(i.purchasedAt) === year,
  );
  const spent = bought.reduce(
    (sum, i) => sum + ((onSale(i) ? i.salePrice : i.price) ?? 0),
    0,
  );
  const saved = bought.reduce(
    (sum, i) => sum + (onSale(i) ? i.price! - i.salePrice! : 0),
    0,
  );
  // Wishes that came true: bought for yourself this year (not as a gift for
  // someone else). The most wanted one, then the priciest.
  const forMe = bought.filter((i) => !i.gifted && (i.interest ?? 0) > 0);
  const cameTrue =
    [...forMe].sort(
      (a, b) =>
        (b.interest ?? 0) - (a.interest ?? 0) ||
        (b.price ?? 0) - (a.price ?? 0),
    )[0] ?? null;
  const mostWorn =
    [...wears]
      .filter((w) => w.wears > 0)
      .sort((a, b) => b.wears - a.wears || a.title.localeCompare(b.title))[0] ??
    null;

  return {
    year,
    added: added.length,
    bought: bought.length,
    spent: round2(spent),
    saved: round2(saved),
    // Each item once, whether it was added, bought or both this year.
    topStore: top([...new Set([...added, ...bought])].map((i) => i.store)),
    topCategory: top(added.map((i) => i.category)),
    cameTrue: cameTrue
      ? { title: cameTrue.title, interest: cameTrue.interest ?? 0 }
      : null,
    mostWorn,
  };
}

// The text shared from the recap. Amounts only when asked for.
export function recapShareText(
  recap: Recap,
  { includeAmounts }: { includeAmounts: boolean },
): string {
  const lines = [`My ${recap.year} in Cubby`];
  lines.push(
    `${recap.added} thing${recap.added === 1 ? "" : "s"} added to my wishlist, ${recap.bought} bought`,
  );
  if (includeAmounts && recap.saved > 0) {
    lines.push(`Saved $${recap.saved.toFixed(2)} by buying on sale`);
  }
  if (recap.topStore) lines.push(`Top store: ${recap.topStore.name}`);
  if (recap.topCategory) lines.push(`Top category: ${recap.topCategory.name}`);
  if (recap.cameTrue) lines.push(`Wish come true: ${recap.cameTrue.title}`);
  if (recap.mostWorn) {
    lines.push(`Most worn: ${recap.mostWorn.title} (${recap.mostWorn.wears}×)`);
  }
  return lines.join("\n");
}
