import { describe, expect, it } from "vitest";
import { viewSharedItems, type ShareViewItem } from "./share-view";

type Item = ShareViewItem & { id: string };
const item = (id: string, o: Partial<Item> = {}): Item => ({
  id,
  price: null,
  sale_price: null,
  mostWanted: false,
  claimed: false,
  ...o,
});

const boots = item("boots", { price: 120, mostWanted: true });
const scarf = item("scarf", { price: 60, sale_price: 45 });
const candle = item("candle", { price: 38, claimed: true });
const mug = item("mug", { price: 20 });
const mystery = item("mystery");
const all = [scarf, candle, boots, mug, mystery];
const ids = (items: Item[]) => items.map((i) => i.id);

describe("viewSharedItems", () => {
  it("suggested: most wanted first, claimed last, list order otherwise", () => {
    expect(ids(viewSharedItems(all, null, "suggested"))).toEqual([
      "boots",
      "scarf",
      "mug",
      "mystery",
      "candle",
    ]);
  });

  it("filters by budget using the price paid, dropping unpriced items", () => {
    expect(ids(viewSharedItems(all, 50, "suggested"))).toEqual([
      "scarf",
      "mug",
      "candle",
    ]);
  });

  it("sorts by price either way, unpriced last, claimed still last", () => {
    expect(ids(viewSharedItems(all, null, "price_asc"))).toEqual([
      "mug",
      "scarf",
      "boots",
      "mystery",
      "candle",
    ]);
    expect(ids(viewSharedItems(all, null, "price_desc"))).toEqual([
      "boots",
      "scarf",
      "mug",
      "mystery",
      "candle",
    ]);
  });
});
