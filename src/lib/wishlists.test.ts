import { describe, expect, it } from "vitest";
import {
  WISHLIST_NAME_MAX_LENGTH,
  deletedItemsMessage,
  listsHoldingAny,
  parseWishlistName,
  toSharedWishlist,
  wishlistItemPairs,
  type SharedWishlistRow,
} from "./wishlists";

describe("parseWishlistName", () => {
  it("trims and collapses whitespace", () => {
    expect(parseWishlistName("  Mom's   birthday ")).toEqual({
      ok: true,
      name: "Mom's birthday",
    });
  });

  it("rejects blank names", () => {
    expect(parseWishlistName("   ").ok).toBe(false);
  });

  it("rejects names over the max length", () => {
    expect(parseWishlistName("x".repeat(WISHLIST_NAME_MAX_LENGTH)).ok).toBe(
      true,
    );
    expect(parseWishlistName("x".repeat(WISHLIST_NAME_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });
});

describe("wishlistItemPairs", () => {
  it("returns every wishlist × item pair", () => {
    expect(wishlistItemPairs(["i1", "i2"], ["w1", "w2"])).toEqual([
      { wishlist_id: "w1", item_id: "i1" },
      { wishlist_id: "w1", item_id: "i2" },
      { wishlist_id: "w2", item_id: "i1" },
      { wishlist_id: "w2", item_id: "i2" },
    ]);
  });

  it("dedupes repeated ids", () => {
    expect(wishlistItemPairs(["i1", "i1"], ["w1", "w1"])).toEqual([
      { wishlist_id: "w1", item_id: "i1" },
    ]);
  });

  it("returns nothing when either side is empty", () => {
    expect(wishlistItemPairs([], ["w1"])).toEqual([]);
    expect(wishlistItemPairs(["i1"], [])).toEqual([]);
  });
});

describe("toSharedWishlist", () => {
  const row = (over: Partial<SharedWishlistRow>): SharedWishlistRow => ({
    wishlist_name: "Birthday",
    item_id: "i1",
    title: "Sweater",
    image_url: null,
    link: null,
    price: 100,
    sale_price: null,
    notes: null,
    store_brand: null,
    ...over,
  });

  it("returns null when the token matched nothing", () => {
    expect(toSharedWishlist([])).toBeNull();
  });

  it("maps item rows", () => {
    const shared = toSharedWishlist([
      row({ item_id: "i1", title: "Sweater" }),
      row({ item_id: "i2", title: "Boots" }),
    ]);
    expect(shared?.name).toBe("Birthday");
    expect(shared?.items.map((i) => i.title)).toEqual(["Sweater", "Boots"]);
  });

  it("treats the LEFT JOIN placeholder row as an empty list", () => {
    expect(
      toSharedWishlist([row({ item_id: null, title: null, price: null })]),
    ).toEqual({ name: "Birthday", items: [] });
  });
});

describe("listsHoldingAny", () => {
  const lists = [
    { name: "Mom", itemIds: ["a", "b"] },
    { name: "Partner", itemIds: ["c"] },
    { name: "Empty", itemIds: [] },
  ];

  it("names each list holding any selected item, once, in order", () => {
    expect(listsHoldingAny(["b", "c", "a"], lists)).toEqual(["Mom", "Partner"]);
  });

  it("is empty when none of the items are on a list", () => {
    expect(listsHoldingAny(["z"], lists)).toEqual([]);
    expect(listsHoldingAny([], lists)).toEqual([]);
  });
});

describe("deletedItemsMessage", () => {
  it("counts items", () => {
    expect(deletedItemsMessage(1)).toBe("Deleted 1 item.");
    expect(deletedItemsMessage(3)).toBe("Deleted 3 items.");
  });
});
