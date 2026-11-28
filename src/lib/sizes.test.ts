import { describe, expect, it } from "vitest";
import {
  hasSizes,
  parseListExtras,
  parseSizes,
  sizeHint,
  sizeKindsFor,
} from "./sizes";

describe("parseSizes", () => {
  it("keeps known kinds with a value, trimmed and capped", () => {
    expect(
      parseSizes({
        tops: "  M ",
        shoes: "8.5",
        bras: "",
        hats: "L",
        other: "x".repeat(100),
        rings: 6,
      }),
    ).toEqual({ tops: "M", shoes: "8.5", other: "x".repeat(80) });
  });

  it("reads anything else as no sizes", () => {
    expect(parseSizes(null)).toEqual({});
    expect(hasSizes(parseSizes("M"))).toBe(false);
  });
});

describe("sizeKindsFor", () => {
  it.each([
    ["Sneakers", "Shoes", ["shoes"]],
    ["Boots", "Shoes", ["shoes"]],
    ["Sports Bras", "Clothing", ["bras"]],
    ["Earrings", "Misc", []],
    ["Rings", "Misc", ["rings"]],
    ["Gym Pants", "Clothing", ["bottoms"]],
    ["Long Sleeve Sweaters", "Clothing", ["tops"]],
    ["Jackets & Coats", "Clothing", ["tops"]],
    ["Pajama Tops & Bottoms", "Clothing", ["tops", "bottoms"]],
    ["Short Sleeve Blouses & Tops", "Clothing", ["tops"]],
    ["Wide Leg Jeans", "Clothing", ["bottoms"]],
    ["Midi Dresses", "Clothing", ["dresses"]],
    ["Makeup", "Beauty", []],
    ["Bootcut Jeans", "Clothing", ["bottoms"]],
    ["Flat Iron", "Beauty", []],
    ["Flats", "Shoes", ["shoes"]],
    ["Ankle Boots", "Misc", ["shoes"]],
  ])("%s (%s) → %j", (type, category, expected) => {
    expect(sizeKindsFor(type, category)).toEqual(expected);
  });
});

describe("sizeHint", () => {
  const sizes = { tops: "M", bottoms: "6", shoes: "8.5" };

  it("names the one matching size", () => {
    expect(sizeHint(sizes, "Sneakers", "Shoes")).toBe("Size 8.5");
  });

  it("labels each size when several match", () => {
    expect(sizeHint(sizes, "Lounge Tops & Bottoms", "Clothing")).toBe(
      "Tops M · Bottoms 6",
    );
  });

  it("is null when nothing matches or the size is missing", () => {
    expect(sizeHint(sizes, "Makeup", "Beauty")).toBeNull();
    expect(sizeHint(sizes, "Sports Bras", "Clothing")).toBeNull();
  });
});

describe("parseListExtras", () => {
  it("reads sizes and per-item details", () => {
    const extras = parseListExtras({
      sizes: { shoes: "8" },
      items: [
        {
          item_id: "a",
          item_type: "Boots",
          category: "Shoes",
          most_wanted: true,
        },
        {
          item_id: "b",
          item_type: "Makeup",
          category: "Beauty",
          most_wanted: false,
          in_stock: false,
          stock_size: "m",
        },
        { nope: true },
      ],
    });
    expect(extras.sizes).toEqual({ shoes: "8" });
    expect(extras.occasionDate).toBeNull();
    expect(extras.items.get("a")).toEqual({
      itemType: "Boots",
      category: "Shoes",
      mostWanted: true,
      inStock: null,
      stockSize: null,
    });
    expect(extras.items.size).toBe(2);
    expect(extras.items.get("b")).toMatchObject({
      inStock: false,
      stockSize: "m",
    });
  });

  it("reads a valid occasion date only", () => {
    expect(
      parseListExtras({ occasion_date: "2026-12-25", items: [] }).occasionDate,
    ).toBe("2026-12-25");
    expect(
      parseListExtras({ occasion_date: "soon", items: [] }).occasionDate,
    ).toBeNull();
  });

  it("treats hidden or empty sizes as none, and bad data as no extras", () => {
    expect(parseListExtras({ sizes: null, items: [] }).sizes).toBeNull();
    expect(parseListExtras({ sizes: {}, items: [] }).sizes).toBeNull();
    expect(parseListExtras(null).items.size).toBe(0);
  });
});
