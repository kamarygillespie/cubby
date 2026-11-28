// "Copy wishlist" (KAM-91): the wishlist as plain text, readable by a person
// and ready to paste into an AI chat for ideas.
import { formatCurrency } from "@/lib/format";
import { lookingForLine, type LookingForEntry } from "@/lib/looking-for";

export type CopyItem = {
  title: string;
  store: string | null;
  price: number | null;
  salePrice: number | null;
  type: string;
  category: string;
  interest: number | null;
  link: string | null;
  notes: string | null;
};

export type CopyOptions = {
  includeNotes: boolean;
  withPrompt: boolean;
  // Price ranges for the ideas (KAM-93); empty = any price.
  priceRanges?: readonly PriceRangeKey[];
  // Things wanted but not found yet (KAM-102).
  lookingFor?: LookingForEntry[];
  // Filters were applied, so this is part of the wishlist.
  filtered?: boolean;
};

export const IDEAS_PROMPT =
  "Here's my wishlist. Suggest 10 things I'd probably like that aren't on it. " +
  "For each one, give the product name, the store, roughly what it costs, a " +
  "link if you have one, and one line on why it fits my taste.";

// Price ranges for the ideas (KAM-93). None selected = any price.
export const PRICE_RANGES = [
  { key: "under30", label: "Under $30", min: 0, max: 30 },
  { key: "30to100", label: "$30 to $100", min: 30, max: 100 },
  { key: "over100", label: "$100+", min: 100, max: Infinity },
] as const;
export type PriceRangeKey = (typeof PRICE_RANGES)[number]["key"];

// "under $100", "$30 and up", "between $30 and $100", "under $30 or $100
// and up"; null for any price. Adjacent ranges merge into one.
export function priceRangePhrase(
  selected: readonly PriceRangeKey[],
): string | null {
  const chosen = PRICE_RANGES.filter((r) => selected.includes(r.key));
  if (chosen.length === 0 || chosen.length === PRICE_RANGES.length) return null;
  const spans: { min: number; max: number }[] = [];
  for (const r of chosen) {
    const last = spans.at(-1);
    if (last && last.max === r.min) last.max = r.max;
    else spans.push({ min: r.min, max: r.max });
  }
  const say = ({ min, max }: { min: number; max: number }) =>
    min === 0
      ? `under $${max}`
      : max === Infinity
        ? `$${min} and up`
        : `between $${min} and $${max}`;
  return spans.map(say).join(" or ");
}

export function ideasPrompt(selected: readonly PriceRangeKey[] = []): string {
  const range = priceRangePhrase(selected);
  return range
    ? IDEAS_PROMPT.replace("aren't on it.", `aren't on it, priced ${range}.`)
    : IDEAS_PROMPT;
}

const onSale = (item: CopyItem) =>
  item.price !== null && item.salePrice !== null && item.salePrice < item.price;

const paid = (item: CopyItem) => (onSale(item) ? item.salePrice : item.price);

function priceText(item: CopyItem): string | null {
  if (item.price === null) return null;
  return onSale(item)
    ? `${formatCurrency(item.salePrice!)} on sale (was ${formatCurrency(item.price)})`
    : formatCurrency(item.price);
}

// "Madewell (3), Quince (2)": most common first, ties by name, top `limit`.
function topCounts(values: (string | null)[], limit = 5): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, n]) => `${name} (${n})`)
    .join(", ");
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

export function wishlistAsText(
  items: CopyItem[],
  {
    includeNotes,
    withPrompt,
    filtered = false,
    priceRanges = [],
    lookingFor = [],
  }: CopyOptions,
): string {
  const lines: string[] = [];
  if (withPrompt) {
    lines.push(
      ideasPrompt(priceRanges) +
        (lookingFor.length
          ? " Also suggest 2 or 3 specific products for each thing I'm still looking for, listed at the end."
          : ""),
      "",
    );
  }

  const n = items.length;
  const total = items.reduce((sum, item) => sum + (paid(item) ?? 0), 0);
  lines.push(
    `My wishlist${filtered ? " (filtered)" : ""}: ${n} item${n === 1 ? "" : "s"}, ${formatCurrency(total)} total`,
  );
  const stores = topCounts(items.map((i) => i.store));
  const categories = topCounts(items.map((i) => i.category));
  if (stores) lines.push(`Top stores: ${stores}`);
  if (categories) lines.push(`Top categories: ${categories}`);

  const byCategory = new Map<string, CopyItem[]>();
  for (const item of items) {
    byCategory.set(item.category, [
      ...(byCategory.get(item.category) ?? []),
      item,
    ]);
  }
  for (const [category, group] of [...byCategory].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push("", `## ${category}`);
    for (const item of group) {
      const parts = [
        oneLine(item.title),
        item.store,
        priceText(item),
        item.type.toLowerCase() === category.toLowerCase() ? null : item.type,
        item.interest ? `interest ${item.interest}/5` : null,
        item.link,
      ].filter(Boolean);
      lines.push(`- ${parts.join(" | ")}`);
      if (includeNotes && item.notes?.trim()) {
        lines.push(`  Notes: ${oneLine(item.notes)}`);
      }
    }
  }
  if (lookingFor.length) {
    lines.push("", "## Still looking for");
    for (const entry of lookingFor) lines.push(`- ${lookingForLine(entry)}`);
  }
  return lines.join("\n");
}
