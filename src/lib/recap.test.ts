import { describe, expect, it } from "vitest";
import { recapShareText, yearRecap, type RecapItem } from "./recap";

const yearOf = (iso: string) => Number(iso.slice(0, 4));
const item = (o: Partial<RecapItem>): RecapItem => ({
  title: "Item",
  createdAt: "2026-03-01T00:00:00Z",
  purchasedAt: null,
  purchased: false,
  gifted: false,
  price: null,
  salePrice: null,
  interest: null,
  store: null,
  category: "Clothing",
  ...o,
});

const items = [
  item({
    title: "Boots",
    store: "Madewell",
    price: 200,
    salePrice: 150,
    interest: 5,
    purchased: true,
    purchasedAt: "2026-10-01T00:00:00Z",
  }),
  item({
    title: "Tee",
    store: "madewell",
    price: 30,
    interest: 5,
    purchased: true,
    purchasedAt: "2026-06-01T00:00:00Z",
  }),
  item({
    title: "Gift for Mom",
    store: "Quince",
    price: 80,
    interest: 2,
    purchased: true,
    gifted: true,
    purchasedAt: "2026-12-01T00:00:00Z",
  }),
  item({ title: "Blush", store: "Rare Beauty", category: "Beauty", price: 25 }),
  item({
    title: "Old Coat",
    createdAt: "2025-11-01T00:00:00Z",
    price: 300,
    purchased: true,
    purchasedAt: "2025-12-01T00:00:00Z",
  }),
];

describe("yearRecap", () => {
  it("counts the year's adds, buys, spending and sale savings", () => {
    const recap = yearRecap(items, [], 2026, yearOf);
    expect(recap).toMatchObject({
      year: 2026,
      added: 4,
      bought: 3,
      spent: 260, // 150 + 30 + 80
      saved: 50,
    });
  });

  it("finds the top store (ignoring case) and category", () => {
    const recap = yearRecap(items, [], 2026, yearOf);
    expect(recap.topStore).toEqual({ name: "Madewell", count: 4 });
    expect(recap.topCategory).toEqual({ name: "Clothing", count: 3 });
  });

  it("picks the most wanted thing bought for yourself, then the priciest", () => {
    expect(yearRecap(items, [], 2026, yearOf).cameTrue).toEqual({
      title: "Boots",
      interest: 5,
    });
  });

  it("picks the most worn piece, and handles an empty year", () => {
    const recap = yearRecap(
      items,
      [
        { title: "Scarf", wears: 4 },
        { title: "Coat", wears: 12 },
      ],
      2026,
      yearOf,
    );
    expect(recap.mostWorn).toEqual({ title: "Coat", wears: 12 });
    expect(yearRecap([], [], 2026, yearOf)).toMatchObject({
      added: 0,
      bought: 0,
      topStore: null,
      cameTrue: null,
      mostWorn: null,
    });
  });
});

describe("recapShareText", () => {
  const recap = yearRecap(items, [{ title: "Coat", wears: 12 }], 2026, yearOf);

  it("leaves amounts out unless asked", () => {
    const text = recapShareText(recap, { includeAmounts: false });
    expect(text).toBe(
      [
        "My 2026 in Cubby",
        "4 things added to my wishlist, 3 bought",
        "Top store: Madewell",
        "Top category: Clothing",
        "Wish come true: Boots",
        "Most worn: Coat (12×)",
      ].join("\n"),
    );
    expect(recapShareText(recap, { includeAmounts: true })).toContain(
      "Saved $50.00 by buying on sale",
    );
  });
});
