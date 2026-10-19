import { describe, expect, it } from "vitest";
import {
  WISHLIST_NAME_MAX_LENGTH,
  parseWishlistName,
  wishlistItemPairs,
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
