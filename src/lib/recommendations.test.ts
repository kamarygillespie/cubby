import { describe, expect, it } from "vitest";
import {
  buyNext,
  moreLikeThis,
  tasteProfile,
  type RecItem,
} from "./recommendations";

const item = (over: Partial<RecItem> & { id: string }): RecItem => ({
  title: over.id,
  price: 100,
  sale_price: null,
  interest_level: 3,
  store_brand: null,
  category: "Clothing",
  itemType: "Sweaters",
  ...over,
});

describe("buyNext", () => {
  const purchased = [
    item({ id: "p1", store_brand: "Everlane" }),
    item({ id: "p2", store_brand: "Everlane" }),
    item({ id: "p3", category: "Shoes", itemType: "Boots" }),
  ];

  it("ranks by interest, discount, drops and affinity, with reasons", () => {
    const picks = buyNext(
      [
        item({
          id: "sweater",
          interest_level: 5,
          price: 128,
          sale_price: 89,
          store_brand: "Everlane",
        }),
        item({
          id: "boots",
          interest_level: 5,
          category: "Shoes",
          itemType: "Boots",
        }),
        item({
          id: "meh",
          interest_level: 1,
          category: "Beauty",
          itemType: "Skincare",
        }),
      ],
      purchased,
    );
    expect(picks.map((p) => p.item.id)).toEqual(["sweater", "boots", "meh"]);
    expect(picks[0].reasons).toEqual([
      "5★",
      "30% off",
      "you buy a lot of Clothing",
      "you've bought from Everlane before",
    ]);
    expect(picks[1].reasons).toEqual(["5★"]);
  });

  it("rewards a recent price drop from history", () => {
    const [pick] = buyNext(
      [item({ id: "a", price: 80 })],
      [],
      new Map([["a", 100]]),
    );
    expect(pick.reasons).toContain("price dropped 20% recently");
  });

  it("skips items with nothing going for them and respects the limit", () => {
    expect(buyNext([item({ id: "x", interest_level: null })], [])).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) =>
      item({ id: `i${i}`, interest_level: 4 }),
    );
    expect(buyNext(many, [], new Map(), 5)).toHaveLength(5);
  });
});

describe("moreLikeThis", () => {
  it("finds same type or store, best matches first", () => {
    const base = item({
      id: "base",
      store_brand: "Mejuri",
      itemType: "Earrings",
    });
    const similar = moreLikeThis(base, [
      base,
      item({ id: "both", store_brand: "mejuri", itemType: "Earrings" }),
      item({ id: "a-type", itemType: "Earrings" }),
      item({ id: "a-store", store_brand: "Mejuri", itemType: "Necklaces" }),
      item({ id: "neither", itemType: "Boots" }),
    ]);
    expect(similar.map((s) => s.id)).toEqual(["both", "a-store", "a-type"]);
  });
});

describe("tasteProfile", () => {
  it("summarizes categories, stores and the middle of your price range", () => {
    const t = tasteProfile([
      item({ id: "1", price: 40, store_brand: "Everlane" }),
      item({ id: "2", price: 60, store_brand: "everlane" }),
      item({
        id: "3",
        price: 100,
        category: "Shoes",
        store_brand: "Dr. Martens",
      }),
      item({ id: "4", price: 200, category: "Shoes" }),
    ]);
    expect(t.topCategories).toEqual([
      { name: "Clothing", share: 50 },
      { name: "Shoes", share: 50 },
    ]);
    expect(t.topStores[0]).toEqual({ name: "Everlane", count: 2 });
    expect(t.priceRange).toEqual({ low: 55, high: 125 });
    expect(t.purchaseCount).toBe(4);
  });

  it("handles no purchases", () => {
    expect(tasteProfile([])).toEqual({
      topCategories: [],
      topStores: [],
      priceRange: null,
      purchaseCount: 0,
    });
  });
});
