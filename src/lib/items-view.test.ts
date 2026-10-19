import { describe, expect, test } from "vitest";
import type { Item } from "@/lib/db/items";
import {
  activeWishlistItems,
  displayDiscountPercent,
  itemMetaParts,
  filterByView,
  filterItems,
  groupByCategory,
  groupByItemType,
  isOnSale,
  sortItems,
  totalSpent,
  totalWishlistValue,
} from "./items-view";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    title: "Item",
    image_url: null,
    link: null,
    price: 100,
    sale_price: null,
    discount_percent: null,
    interest_level: null,
    purchased: false,
    purchased_date: null,
    gifted: false,
    notes: null,
    store_brand: null,
    item_type_id: "type-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_type: {
      id: "type-1",
      name: "Sweaters",
      category: { id: "cat-1", name: "Clothing" },
    },
    ...overrides,
  } as Item;
}

describe("isOnSale", () => {
  test("true when sale_price is lower than price", () => {
    expect(isOnSale(makeItem({ price: 100, sale_price: 75 }))).toBe(true);
  });

  test("false when there's no sale_price", () => {
    expect(isOnSale(makeItem({ price: 100, sale_price: null }))).toBe(false);
  });

  test("false when sale_price is not lower than price", () => {
    expect(isOnSale(makeItem({ price: 100, sale_price: 100 }))).toBe(false);
  });

  test("false when price is null", () => {
    expect(isOnSale(makeItem({ price: null, sale_price: 50 }))).toBe(false);
  });
});

describe("filterItems", () => {
  const clothingItem = makeItem({
    item_type: {
      id: "type-a",
      name: "Sweaters",
      category: { id: "cat-1", name: "Clothing" },
    },
  });
  const techItem = makeItem({
    item_type: {
      id: "type-b",
      name: "Headphones",
      category: { id: "cat-2", name: "Technology" },
    },
  });
  const saleItem = makeItem({ price: 100, sale_price: 50 });

  test("filters by category", () => {
    const result = filterItems([clothingItem, techItem], {
      categoryId: "cat-1",
    });
    expect(result).toEqual([clothingItem]);
  });

  test("filters by item type", () => {
    const result = filterItems([clothingItem, techItem], {
      itemTypeId: "type-b",
    });
    expect(result).toEqual([techItem]);
  });

  test("filters to on-sale items only", () => {
    const result = filterItems([clothingItem, saleItem], { onSaleOnly: true });
    expect(result).toEqual([saleItem]);
  });

  test("no filters returns everything", () => {
    const result = filterItems([clothingItem, techItem], {});
    expect(result).toHaveLength(2);
  });
});

describe("sortItems", () => {
  test("sorts by interest level, high to low", () => {
    const low = makeItem({ interest_level: 2 });
    const high = makeItem({ interest_level: 5 });
    const none = makeItem({ interest_level: null });
    expect(sortItems([low, none, high], "interest_desc")).toEqual([
      high,
      low,
      none,
    ]);
  });

  test("sorts by price descending, preferring sale_price when on sale", () => {
    const cheap = makeItem({ price: 20, sale_price: null });
    const onSale = makeItem({ price: 200, sale_price: 30 });
    const expensive = makeItem({ price: 100, sale_price: null });
    expect(sortItems([cheap, onSale, expensive], "price_desc")).toEqual([
      expensive,
      onSale,
      cheap,
    ]);
  });

  test("sorts by price ascending", () => {
    const cheap = makeItem({ price: 20 });
    const expensive = makeItem({ price: 100 });
    expect(sortItems([expensive, cheap], "price_asc")).toEqual([
      cheap,
      expensive,
    ]);
  });

  test("null sort leaves order untouched", () => {
    const a = makeItem();
    const b = makeItem();
    expect(sortItems([a, b], null)).toEqual([a, b]);
  });
});

describe("groupByCategory", () => {
  test("groups items, counting and summing effective price per category", () => {
    const clothing1 = makeItem({
      price: 50,
      item_type: {
        id: "t1",
        name: "Sweaters",
        category: { id: "c1", name: "Clothing" },
      },
    });
    const clothing2 = makeItem({
      price: 100,
      sale_price: 80,
      item_type: {
        id: "t2",
        name: "Shoes",
        category: { id: "c1", name: "Clothing" },
      },
    });
    const tech = makeItem({
      price: 200,
      item_type: {
        id: "t3",
        name: "Headphones",
        category: { id: "c2", name: "Technology" },
      },
    });

    const groups = groupByCategory([clothing1, clothing2, tech]);

    expect(groups).toEqual([
      {
        id: "c1",
        name: "Clothing",
        items: [clothing1, clothing2],
        count: 2,
        totalPrice: 130,
      },
      {
        id: "c2",
        name: "Technology",
        items: [tech],
        count: 1,
        totalPrice: 200,
      },
    ]);
  });
});

describe("groupByItemType", () => {
  test("groups items by item type", () => {
    const a = makeItem({
      item_type: {
        id: "t1",
        name: "Sweaters",
        category: { id: "c1", name: "Clothing" },
      },
    });
    const b = makeItem({
      item_type: {
        id: "t1",
        name: "Sweaters",
        category: { id: "c1", name: "Clothing" },
      },
    });

    const groups = groupByItemType([a, b]);

    expect(groups).toEqual([
      { id: "t1", name: "Sweaters", items: [a, b], count: 2, totalPrice: 200 },
    ]);
  });
});

describe("filterByView", () => {
  const active = makeItem({ purchased: false, gifted: false });
  const purchased = makeItem({ purchased: true, gifted: false });
  const gifted = makeItem({ purchased: false, gifted: true });
  const all = [active, purchased, gifted];

  test("wishlist view excludes purchased and gifted items", () => {
    expect(filterByView(all, "wishlist")).toEqual([active]);
  });

  test("purchased view includes only purchased items", () => {
    expect(filterByView(all, "purchased")).toEqual([purchased]);
  });

  test("gifted view includes only gifted items", () => {
    expect(filterByView(all, "gifted")).toEqual([gifted]);
  });

  test("an item that is both purchased and gifted appears in both views", () => {
    const both = makeItem({ purchased: true, gifted: true });
    const items = [active, both];
    expect(filterByView(items, "purchased")).toEqual([both]);
    expect(filterByView(items, "gifted")).toEqual([both]);
    expect(filterByView(items, "wishlist")).toEqual([active]);
  });
});

describe("totals", () => {
  const active = makeItem({ price: 50, purchased: false, gifted: false });
  const purchasedFullPrice = makeItem({
    price: 100,
    purchased: true,
    gifted: false,
  });
  const purchasedOnSale = makeItem({
    price: 80,
    sale_price: 60,
    purchased: true,
    gifted: false,
  });
  const gifted = makeItem({ price: 200, purchased: false, gifted: true });
  const all = [active, purchasedFullPrice, purchasedOnSale, gifted];

  test("activeWishlistItems excludes purchased and gifted", () => {
    expect(activeWishlistItems(all)).toEqual([active]);
  });

  test("totalSpent sums purchased items at effective (sale) price", () => {
    expect(totalSpent(all)).toBe(100 + 60);
  });

  test("totalWishlistValue sums only active items", () => {
    expect(totalWishlistValue(all)).toBe(50);
  });

  test("both totals are zero with no matching items", () => {
    expect(totalSpent([gifted])).toBe(0);
    expect(totalWishlistValue([purchasedFullPrice, gifted])).toBe(0);
  });
});

describe("displayDiscountPercent", () => {
  test("rounds to a whole percent", () => {
    expect(displayDiscountPercent(128, 89)).toBe(30); // 30.47%
    expect(displayDiscountPercent(249, 199)).toBe(20); // 20.08%
    expect(displayDiscountPercent(3, 2)).toBe(33);
  });

  test("is null when not on sale", () => {
    expect(displayDiscountPercent(100, null)).toBeNull();
    expect(displayDiscountPercent(null, 50)).toBeNull();
    expect(displayDiscountPercent(100, 100)).toBeNull();
    expect(displayDiscountPercent(100, 120)).toBeNull();
    expect(displayDiscountPercent(0, 0)).toBeNull();
  });

  test("hides discounts that round to 0%", () => {
    expect(displayDiscountPercent(1000, 999)).toBeNull();
  });
});

describe("itemMetaParts", () => {
  const withTaxonomy = (type: string, category: string, store: string | null) =>
    makeItem({
      store_brand: store,
      item_type: {
        id: "t",
        name: type,
        category: { id: "c", name: category },
      },
    });

  test("type · category · store", () => {
    expect(
      itemMetaParts(withTaxonomy("Boots", "Shoes", "Dr. Martens")),
    ).toEqual(["Boots", "Shoes", "Dr. Martens"]);
  });

  test("drops a category that repeats the type", () => {
    expect(
      itemMetaParts(withTaxonomy("Technology", "Technology", "Apple")),
    ).toEqual(["Technology", "Apple"]);
    expect(itemMetaParts(withTaxonomy("Misc", "misc", null))).toEqual(["Misc"]);
  });
});
