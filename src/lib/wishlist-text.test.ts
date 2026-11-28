import { describe, expect, it } from "vitest";
import {
  IDEAS_PROMPT,
  ideasPrompt,
  priceRangePhrase,
  wishlistAsText,
  type CopyItem,
} from "./wishlist-text";

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

describe("price ranges for ideas (KAM-93)", () => {
  it("describes one range", () => {
    expect(priceRangePhrase(["under30"])).toBe("under $30");
    expect(priceRangePhrase(["30to100"])).toBe("between $30 and $100");
    expect(priceRangePhrase(["over100"])).toBe("$100 and up");
  });

  it("merges adjacent ranges and joins separate ones", () => {
    expect(priceRangePhrase(["under30", "30to100"])).toBe("under $100");
    expect(priceRangePhrase(["over100", "30to100"])).toBe("$30 and up");
    expect(priceRangePhrase(["under30", "over100"])).toBe(
      "under $30 or $100 and up",
    );
  });

  it("means any price with none or all selected", () => {
    expect(priceRangePhrase([])).toBeNull();
    expect(priceRangePhrase(["under30", "30to100", "over100"])).toBeNull();
    expect(ideasPrompt([])).toBe(IDEAS_PROMPT);
  });

  it("puts the range into the prompt", () => {
    expect(ideasPrompt(["30to100"])).toContain(
      "that aren't on it, priced between $30 and $100.",
    );
    expect(
      wishlistAsText([], {
        includeNotes: false,
        withPrompt: true,
        priceRanges: ["under30"],
      }),
    ).toContain("aren't on it, priced under $30.");
  });
});

describe("still looking for (KAM-102)", () => {
  const lookingFor = [
    { title: "Essential oil diffuser", budget: 60, notes: "white or wood" },
    { title: "Desk lamp", budget: null, notes: null },
  ];

  it("lists them at the end and asks for products for them", () => {
    const text = wishlistAsText([], {
      includeNotes: false,
      withPrompt: true,
      lookingFor,
    });
    expect(text).toContain("Also suggest 2 or 3 specific products");
    expect(
      text.endsWith(
        [
          "## Still looking for",
          "- Essential oil diffuser (under $60.00): white or wood",
          "- Desk lamp",
        ].join("\n"),
      ),
    ).toBe(true);
  });

  it("leaves both out when there's nothing", () => {
    const text = wishlistAsText([], { includeNotes: false, withPrompt: true });
    expect(text).not.toContain("Still looking for");
    expect(text).not.toContain("Also suggest");
  });
});
