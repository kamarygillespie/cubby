// Pure "Check price" logic: given an item's saved prices and freshly fetched
// ones, decide what to store and how to describe the change.
import { formatCurrency } from "@/lib/format";

export type SavedPrices = { price: number | null; sale_price: number | null };
export type FetchedPrices = { price: number | null; salePrice: number | null };

export type PriceCheckOutcome =
  | "now_on_sale"
  | "price_dropped"
  | "price_rose"
  | "sale_ended"
  | "updated"
  | "unchanged"
  | "unreadable";

export type PriceCheckResult = {
  outcome: PriceCheckOutcome;
  message: string;
  // What to write to the item, or null to leave it alone.
  update: SavedPrices | null;
};

const onSale = (price: number | null, sale: number | null) =>
  price !== null && sale !== null && sale < price;

const effective = (price: number | null, sale: number | null) =>
  onSale(price, sale) ? sale : price;

export function applyPriceCheck(
  saved: SavedPrices,
  fetched: FetchedPrices,
): PriceCheckResult {
  // Never wipe a known price because a page couldn't be read.
  if (fetched.price === null) {
    return {
      outcome: "unreadable",
      message: "Couldn't read the price from this page.",
      update: null,
    };
  }

  const next: SavedPrices = {
    price: fetched.price,
    sale_price: onSale(fetched.price, fetched.salePrice)
      ? fetched.salePrice
      : null,
  };
  const wasOnSale = onSale(saved.price, saved.sale_price);
  const nowOnSale = next.sale_price !== null;
  const before = effective(saved.price, saved.sale_price);
  const after = effective(next.price, next.sale_price)!;

  if (next.price === saved.price && next.sale_price === saved.sale_price) {
    return { outcome: "unchanged", message: "No change.", update: null };
  }
  if (nowOnSale && !wasOnSale) {
    return {
      outcome: "now_on_sale",
      message: `Now on sale: ${formatCurrency(after)} (was ${formatCurrency(next.price!)}).`,
      update: next,
    };
  }
  if (!nowOnSale && wasOnSale) {
    return {
      outcome: "sale_ended",
      message: `Sale ended: back to ${formatCurrency(after)}.`,
      update: next,
    };
  }
  if (before !== null && after < before) {
    return {
      outcome: "price_dropped",
      message: `Price dropped to ${formatCurrency(after)} (was ${formatCurrency(before)}).`,
      update: next,
    };
  }
  if (before !== null && after > before) {
    return {
      outcome: "price_rose",
      message: `Price went up to ${formatCurrency(after)} (was ${formatCurrency(before)}).`,
      update: next,
    };
  }
  return {
    outcome: "updated",
    message: `Price updated: ${formatCurrency(after)}.`,
    update: next,
  };
}

// "2 now on sale, 1 price drop, 5 unchanged" for Check all prices.
export function summarizePriceChecks(outcomes: PriceCheckOutcome[]): string {
  const count = (o: PriceCheckOutcome) =>
    outcomes.filter((x) => x === o).length;
  const parts = [
    [count("now_on_sale"), "now on sale"],
    [
      count("price_dropped"),
      (n: number) => (n === 1 ? "price drop" : "price drops"),
    ],
    [
      count("sale_ended"),
      (n: number) => (n === 1 ? "sale ended" : "sales ended"),
    ],
    [
      count("price_rose"),
      (n: number) => (n === 1 ? "price went up" : "prices went up"),
    ],
    [count("updated"), "updated"],
    [count("unchanged"), "unchanged"],
    [count("unreadable"), "couldn't be read"],
  ] as const;
  const text = parts
    .filter(([n]) => n > 0)
    .map(
      ([n, label]) => `${n} ${typeof label === "function" ? label(n) : label}`,
    );
  return text.length ? text.join(", ") + "." : "Nothing to check.";
}
