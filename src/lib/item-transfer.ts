// Export and import items as CSV (KAM-87). Pure, so it's unit-tested.
import { parseCsv, toCsv, unguardCell } from "./csv";

// Export columns, in order. Import reads the same names (and some aliases).
export const FIELDS = [
  { key: "title", label: "Title", aliases: ["name", "item", "product"] },
  { key: "status", label: "Status", aliases: ["state"] },
  { key: "item_type", label: "Item type", aliases: ["type"] },
  { key: "category", label: "Category", aliases: [] },
  {
    key: "store",
    label: "Store",
    aliases: ["brand", "store_brand", "retailer", "shop"],
  },
  {
    key: "price",
    label: "Price",
    aliases: ["cost", "original price", "regular price"],
  },
  {
    key: "sale_price",
    label: "Sale price",
    aliases: ["sale", "current price"],
  },
  {
    key: "interest",
    label: "Interest",
    aliases: ["interest_level", "rating", "stars", "priority"],
  },
  {
    key: "link",
    label: "Link",
    aliases: ["url", "product url", "product link"],
  },
  {
    key: "image",
    label: "Image",
    aliases: ["image_url", "image url", "photo", "picture"],
  },
  {
    key: "notes",
    label: "Notes",
    aliases: ["note", "comments", "description"],
  },
  {
    key: "purchased_on",
    label: "Purchased on",
    aliases: ["purchased_date", "purchase date", "bought on"],
  },
  { key: "added_on", label: "Added on", aliases: ["created_at", "date added"] },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];

// How an item's state reads in the file, both ways.
export const STATUSES = {
  wishlist: "Wishlist",
  purchased: "Purchased",
  gift_received: "Gift received",
  bought_as_gift: "Bought as a gift",
  closet: "Closet",
  archived: "Archived",
} as const;
export type Status = keyof typeof STATUSES;

export type ExportItem = {
  title: string;
  source: string;
  purchased: boolean;
  gifted: boolean;
  archived_at: string | null;
  item_type: { name: string; category: { name: string } };
  store_brand: string | null;
  price: number | null;
  sale_price: number | null;
  interest_level: number | null;
  link: string | null;
  image_url: string | null;
  notes: string | null;
  purchased_date: string | null;
  created_at: string;
};

export function statusOf(item: ExportItem): Status {
  if (item.source === "closet") return "closet";
  if (item.archived_at) return "archived";
  if (item.purchased && item.gifted) return "bought_as_gift";
  if (item.purchased) return "purchased";
  if (item.gifted) return "gift_received";
  return "wishlist";
}

export function itemsToCsv(items: ExportItem[]): string {
  return toCsv([
    FIELDS.map((f) => f.label),
    ...items.map((item) => [
      item.title,
      STATUSES[statusOf(item)],
      item.item_type.name,
      item.item_type.category.name,
      item.store_brand,
      item.price,
      item.sale_price,
      item.interest_level,
      item.link,
      item.image_url,
      item.notes,
      item.purchased_date?.slice(0, 10),
      item.created_at.slice(0, 10),
    ]),
  ]);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Which file column feeds each field: exact label first, then aliases.
export type ColumnMap = Partial<Record<FieldKey, number>>;
export function autoMapColumns(headers: string[]): ColumnMap {
  const names = headers.map(norm);
  const map: ColumnMap = {};
  const used = new Set<number>();
  for (const field of FIELDS) {
    const candidates = [field.label, field.key, ...field.aliases].map(norm);
    const index = names.findIndex(
      (n, i) => !used.has(i) && candidates.includes(n),
    );
    if (index >= 0) {
      map[field.key] = index;
      used.add(index);
    }
  }
  return map;
}

export type ImportRow = {
  title: string;
  status: Status;
  itemType: string | null;
  store: string | null;
  price: number | null;
  salePrice: number | null;
  interest: number | null;
  link: string | null;
  image: string | null;
  notes: string | null;
  // "YYYY-MM-DD", for purchased items' spending month.
  purchasedOn: string | null;
};

const money = (raw: string): number | null | "bad" => {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 && n < 10_000_000
    ? Math.round(n * 100) / 100
    : "bad";
};

const webUrl = (raw: string): string | null => {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

function parseStatus(raw: string): Status | null {
  const n = norm(raw);
  if (!n) return "wishlist";
  for (const [key, label] of Object.entries(STATUSES)) {
    if (n === norm(label) || n === norm(key)) return key as Status;
  }
  if (["bought", "owned", "have"].includes(n)) return "purchased";
  if (["gift", "gifted"].includes(n)) return "gift_received";
  if (["want", "wanted"].includes(n)) return "wishlist";
  return null;
}

// One data row → an item to add, or why it can't be.
export function parseImportRow(
  row: string[],
  map: ColumnMap,
): { ok: true; value: ImportRow } | { ok: false; error: string } {
  const get = (key: FieldKey) => {
    const i = map[key];
    return i === undefined ? "" : unguardCell(row[i] ?? "").trim();
  };
  const title = get("title").replace(/\s+/g, " ").slice(0, 300);
  if (!title) return { ok: false, error: "No title" };

  const status = parseStatus(get("status"));
  if (!status) return { ok: false, error: `Unknown status "${get("status")}"` };

  const price = money(get("price"));
  const salePrice = money(get("sale_price"));
  if (price === "bad" || salePrice === "bad") {
    return { ok: false, error: "Price isn't a number" };
  }

  const rawInterest = get("interest");
  const interest = rawInterest ? Math.round(Number(rawInterest)) : null;
  if (interest !== null && !(interest >= 1 && interest <= 5)) {
    return { ok: false, error: "Interest must be 1 to 5" };
  }

  const text = (key: FieldKey, max: number) => get(key).slice(0, max) || null;
  return {
    ok: true,
    value: {
      title,
      status,
      itemType: text("item_type", 80),
      store: text("store", 120),
      price,
      salePrice:
        price !== null && salePrice !== null && salePrice < price
          ? salePrice
          : null,
      interest,
      link: webUrl(get("link")),
      image: webUrl(get("image")),
      notes: text("notes", 2000),
      purchasedOn: /^\d{4}-\d{2}-\d{2}/.test(get("purchased_on"))
        ? get("purchased_on").slice(0, 10)
        : null,
    },
  };
}

export const MAX_IMPORT_ROWS = 1000;

// The whole file: its headers, the guessed mapping, and its data rows.
export function readImportFile(text: string): {
  headers: string[];
  rows: string[][];
  map: ColumnMap;
} {
  const [headers = [], ...rows] = parseCsv(text);
  return { headers, rows, map: autoMapColumns(headers) };
}
