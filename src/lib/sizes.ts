// The owner's sizes on share pages (KAM-78), plus the share page's other
// extras (KAM-80). Pure, so it's unit-tested.

export const SIZE_KINDS = [
  { key: "tops", label: "Tops" },
  { key: "bottoms", label: "Bottoms" },
  { key: "dresses", label: "Dresses" },
  { key: "shoes", label: "Shoes" },
  { key: "rings", label: "Rings" },
  { key: "bras", label: "Bras" },
  { key: "other", label: "Other" },
] as const;

export type SizeKind = (typeof SIZE_KINDS)[number]["key"];
export type Sizes = Partial<Record<SizeKind, string>>;

const MAX = 20;
const MAX_OTHER = 80;

const clean = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

// From the form, or from the database: keeps known kinds with a value only.
export function parseSizes(raw: unknown): Sizes {
  const sizes: Sizes = {};
  if (!raw || typeof raw !== "object") return sizes;
  const record = raw as Record<string, unknown>;
  for (const { key } of SIZE_KINDS) {
    const value = clean(record[key], key === "other" ? MAX_OTHER : MAX);
    if (value) sizes[key] = value;
  }
  return sizes;
}

export function hasSizes(sizes: Sizes | null | undefined): boolean {
  return Boolean(sizes && Object.keys(sizes).length > 0);
}

// Which sizes matter for an item: shared with the Edge Functions' stock
// checks, so both use the same matching.
import {
  savedSizeFor,
  sizeKindsFor,
} from "../../supabase/functions/_shared/size-kinds";
export { savedSizeFor, sizeKindsFor };

// "Size M" or "Tops M · Bottoms 6" for one item; null when nothing matches.
export function sizeHint(
  sizes: Sizes,
  itemType: string,
  category: string,
): string | null {
  const kinds = sizeKindsFor(itemType, category).filter((k) => sizes[k]);
  if (kinds.length === 0) return null;
  if (kinds.length === 1) return `Size ${sizes[kinds[0]]}`;
  return kinds
    .map((k) => `${SIZE_KINDS.find((s) => s.key === k)!.label} ${sizes[k]}`)
    .join(" · ");
}

export type ListExtras = {
  sizes: Sizes | null;
  // The list's occasion (KAM-79), "YYYY-MM-DD".
  occasionDate: string | null;
  items: Map<
    string,
    {
      itemType: string;
      category: string;
      mostWanted: boolean;
      // Stock (KAM-75): false = sold out (in stockSize, if set).
      inStock: boolean | null;
      stockSize: string | null;
    }
  >;
};

// get_shared_list_extras() JSON. Malformed data means "no extras", never an
// error on the public page.
export function parseListExtras(raw: unknown): ListExtras {
  const extras: ListExtras = {
    sizes: null,
    occasionDate: null,
    items: new Map(),
  };
  if (!raw || typeof raw !== "object") return extras;
  const data = raw as {
    sizes?: unknown;
    occasion_date?: unknown;
    items?: unknown;
  };
  if (
    typeof data.occasion_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.occasion_date)
  ) {
    extras.occasionDate = data.occasion_date;
  }
  const sizes = parseSizes(data.sizes);
  extras.sizes = hasSizes(sizes) ? sizes : null;
  if (Array.isArray(data.items)) {
    for (const entry of data.items) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.item_id !== "string") continue;
      extras.items.set(e.item_id, {
        itemType: typeof e.item_type === "string" ? e.item_type : "",
        category: typeof e.category === "string" ? e.category : "",
        mostWanted: e.most_wanted === true,
        inStock: typeof e.in_stock === "boolean" ? e.in_stock : null,
        stockSize:
          typeof e.stock_size === "string" ? e.stock_size.slice(0, 20) : null,
      });
    }
  }
  return extras;
}
