import { describe, expect, it } from "vitest";
import {
  giftCardIdeas,
  parseSaleUrl,
  storeKey,
  summarizeStores,
} from "./stores";

const item = (
  store: string | null,
  price: number,
  sale: number | null = null,
) => ({
  store_brand: store,
  price,
  sale_price: sale,
});

describe("storeKey", () => {
  it("normalizes case and whitespace", () => {
    expect(storeKey("  Mejuri ")).toBe("mejuri");
    expect(storeKey("Summer   Fridays")).toBe("summer fridays");
    expect(storeKey("   ")).toBeNull();
    expect(storeKey(null)).toBeNull();
  });
});

describe("giftCardIdeas", () => {
  it("ranks stores by item count, then total value", () => {
    const ideas = giftCardIdeas([
      item("Mejuri", 65, 52),
      item("mejuri ", 120),
      item("Mejuri", 65),
      item("Everlane", 128, 89),
      item("Everlane", 98),
      item("Aritzia", 300),
      item("Aritzia", 150),
      item(null, 40),
      item("Lunya", 178),
    ]);
    expect(ideas).toEqual([
      { store: "Mejuri", itemCount: 3, total: 237 },
      { store: "Aritzia", itemCount: 2, total: 450 },
      { store: "Everlane", itemCount: 2, total: 187 },
    ]);
  });

  it("uses the most common spelling for display", () => {
    expect(
      giftCardIdeas([
        item("everlane", 1),
        item("Everlane", 1),
        item("Everlane", 1),
      ])[0].store,
    ).toBe("Everlane");
  });

  it("can include single-item stores", () => {
    expect(giftCardIdeas([item("Lunya", 178)], { minItems: 1 })).toEqual([
      { store: "Lunya", itemCount: 1, total: 178 },
    ]);
    expect(giftCardIdeas([item("Lunya", 178)])).toEqual([]);
  });
});

describe("summarizeStores", () => {
  it("summarizes per store with sale info, favorites first", () => {
    const rows = summarizeStores(
      [
        item("Mejuri", 65, 52),
        item("mejuri", 120),
        item("Everlane", 128, 89),
        item("Aritzia", 300),
        item("Aritzia", 150),
        item("Aritzia", 40),
      ],
      [{ store_key: "everlane", display_name: "Everlane", sale_url: null }],
    );
    expect(
      rows.map((r) => [
        r.name,
        r.favorite,
        r.itemCount,
        r.onSaleCount,
        r.bestDiscount,
      ]),
    ).toEqual([
      ["Everlane", true, 1, 1, 30],
      ["Mejuri", false, 2, 1, 20],
      ["Aritzia", false, 3, 0, null],
    ]);
    expect(rows[1].total).toBe(172);
  });

  it("keeps favorites that have no items", () => {
    const rows = summarizeStores(
      [],
      [
        {
          store_key: "sezane",
          display_name: "Sézane",
          sale_url: "https://sezane.com/sale",
        },
      ],
    );
    expect(rows).toEqual([
      expect.objectContaining({
        name: "Sézane",
        favorite: true,
        itemCount: 0,
        saleUrl: "https://sezane.com/sale",
      }),
    ]);
  });
});

describe("parseSaleUrl", () => {
  it("accepts web URLs and blank", () => {
    expect(parseSaleUrl(" https://mejuri.com/sale ")).toEqual({
      ok: true,
      url: "https://mejuri.com/sale",
    });
    expect(parseSaleUrl("")).toEqual({ ok: true, url: null });
  });
  it("rejects other schemes and junk", () => {
    expect(parseSaleUrl("javascript:alert(1)").ok).toBe(false);
    expect(parseSaleUrl("not a url").ok).toBe(false);
  });
});
