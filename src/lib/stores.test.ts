import { describe, expect, it } from "vitest";
import { giftCardIdeas, storeKey } from "./stores";

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
