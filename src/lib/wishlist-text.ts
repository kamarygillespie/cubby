// "Copy wishlist" (KAM-91): the wishlist as plain text, readable by a person
// and ready to paste into an AI chat for ideas.
import { formatCurrency } from "@/lib/format";

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
  // Filters were applied, so this is part of the wishlist.
  filtered?: boolean;
};

export const IDEAS_PROMPT =
  "Here's my wishlist. Suggest 10 things I'd probably like that aren't on it. " +
  "For each one, give the product name, the store, roughly what it costs, a " +
  "link if you have one, and one line on why it fits my taste.";

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
  { includeNotes, withPrompt, filtered = false }: CopyOptions,
): string {
  const lines: string[] = [];
  if (withPrompt) lines.push(IDEAS_PROMPT, "");

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
  return lines.join("\n");
}
