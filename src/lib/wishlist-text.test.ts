import { describe, expect, it } from "vitest";
import { IDEAS_PROMPT, wishlistAsText, type CopyItem } from "./wishlist-text";

const item = (overrides: Partial<CopyItem>): CopyItem => ({
  title: "Item",
  store: null,
  price: null,
  salePrice: null,
  type: "Sweaters",
  category: "Clothing",
  interest: null,
  link: null,
  notes: null,
  ...overrides,
});

const pants = item({
  title: "Campus Track Pants",
  store: "Gymshark",
  price: 50,
  salePrice: 30,
  type: "Pants",
  interest: 4,
  link: "https://www.gymshark.com/products/campus",
  notes: "wait for\nsize M",
});
const blush = item({
  title: "Soft Pinch Blush",
  store: "Rare Beauty",
  price: 25,
  type: "Makeup",
  category: "Beauty",
  interest: 5,
});
const tee = item({ title: "Tee", store: "Gymshark", price: 20, type: "Tops" });

describe("wishlistAsText", () => {
  it("summarizes, groups by category and lists one line per item", () => {
    expect(
      wishlistAsText([pants, blush, tee], {
        includeNotes: false,
        withPrompt: false,
      }),
    ).toBe(
      [
        "My wishlist: 3 items, $75.00 total",
        "Top stores: Gymshark (2), Rare Beauty (1)",
        "Top categories: Clothing (2), Beauty (1)",
        "",
        "## Beauty",
        "- Soft Pinch Blush | Rare Beauty | $25.00 | Makeup | interest 5/5",
        "",
        "## Clothing",
        "- Campus Track Pants | Gymshark | $30.00 on sale (was $50.00) | Pants | interest 4/5 | https://www.gymshark.com/products/campus",
        "- Tee | Gymshark | $20.00 | Tops",
      ].join("\n"),
    );
  });

  it("leaves notes out unless asked, and keeps them on one line", () => {
    const opts = { withPrompt: false };
    expect(
      wishlistAsText([pants], { ...opts, includeNotes: false }),
    ).not.toContain("Notes");
    expect(wishlistAsText([pants], { ...opts, includeNotes: true })).toContain(
      "  Notes: wait for size M",
    );
  });

  it("starts with the ideas prompt when asked", () => {
    const text = wishlistAsText([tee], {
      includeNotes: false,
      withPrompt: true,
    });
    expect(text.startsWith(IDEAS_PROMPT)).toBe(true);
  });

  it("says when the list is filtered, and handles one or no items", () => {
    expect(
      wishlistAsText([tee], {
        includeNotes: false,
        withPrompt: false,
        filtered: true,
      }),
    ).toMatch(/^My wishlist \(filtered\): 1 item, \$20\.00 total/);
    expect(wishlistAsText([], { includeNotes: false, withPrompt: false })).toBe(
      "My wishlist: 0 items, $0.00 total",
    );
  });

  it("skips a missing price and the type when it repeats the category", () => {
    expect(
      wishlistAsText([item({ title: "Gift", type: "Clothing" })], {
        includeNotes: false,
        withPrompt: false,
      }),
    ).toMatch(/## Clothing\n- Gift$/);
  });
});
