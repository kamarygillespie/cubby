import { describe, expect, it } from "vitest";
import {
  itemImagePathFromUrl,
  normalizeProductLink,
  parseItemForm,
  parseTargetPrice,
  removeTrackingParams,
  sharedLinkFromParams,
} from "./item-form";

describe("removeTrackingParams", () => {
  it("removes ad tracking and keeps what identifies the product", () => {
    expect(
      removeTrackingParams(
        "https://www2.hm.com/en_us/productpage.0998802055.html?utm_source=google&utm_term=&gclid=abc&gad_source=1&gbraid=x&size=M",
      ),
    ).toBe("https://www2.hm.com/en_us/productpage.0998802055.html?size=M");
  });

  it("leaves a clean link exactly as it was", () => {
    const link = "https://shop.example/sneakers?id=4&color=red%20clay";
    expect(removeTrackingParams(link)).toBe(link);
  });

  it("leaves blanks and non-links alone", () => {
    expect(removeTrackingParams(null)).toBeNull();
    expect(removeTrackingParams("not a link")).toBe("not a link");
  });
});

describe("normalizeProductLink", () => {
  it("keeps a full web address", () => {
    expect(normalizeProductLink("  https://puma.com/shoes?id=4 ")).toBe(
      "https://puma.com/shoes?id=4",
    );
  });

  it("adds https to a bare domain", () => {
    expect(normalizeProductLink("puma.com/shoes")).toBe(
      "https://puma.com/shoes",
    );
  });

  it("finds the link inside a share message", () => {
    expect(normalizeProductLink("Look at these! https://puma.com/a.")).toBe(
      "https://puma.com/a",
    );
  });

  it("rejects text and unsafe addresses", () => {
    expect(normalizeProductLink("")).toBeNull();
    expect(normalizeProductLink("cute shoes")).toBeNull();
    expect(normalizeProductLink("javascript:alert(1)")).toBeNull();
  });
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("parseItemForm", () => {
  it("parses and trims every field, blank → null", () => {
    expect(
      parseItemForm(
        form({
          title: "  Boots ",
          item_type_id: "t1",
          price: "120",
          sale_price: "",
          interest_level: "4",
          store_brand: " Dr. Martens ",
          link: "",
          notes: "   ",
        }),
      ),
    ).toEqual({
      ok: true,
      values: {
        title: "Boots",
        item_type_id: "t1",
        price: 120,
        sale_price: null,
        interest_level: 4,
        store_brand: "Dr. Martens",
        link: null,
        notes: null,
      },
    });
  });

  it("requires a title and item type", () => {
    expect(parseItemForm(form({ item_type_id: "t1" }))).toEqual({
      ok: false,
      error: "Title is required.",
    });
    expect(parseItemForm(form({ title: "Boots" }))).toEqual({
      ok: false,
      error: "Item type is required.",
    });
  });

  it("rejects negative or non-numeric prices", () => {
    expect(
      parseItemForm(form({ title: "x", item_type_id: "t", price: "-1" })).ok,
    ).toBe(false);
    expect(
      parseItemForm(form({ title: "x", item_type_id: "t", sale_price: "abc" }))
        .ok,
    ).toBe(false);
  });

  it("only accepts whole 1–5 star interest levels", () => {
    for (const bad of ["0", "6", "2.5"]) {
      expect(
        parseItemForm(
          form({ title: "x", item_type_id: "t", interest_level: bad }),
        ).ok,
      ).toBe(false);
    }
  });
});

describe("itemImagePathFromUrl", () => {
  it("extracts the bucket path from our public storage URLs", () => {
    expect(
      itemImagePathFromUrl(
        "https://abc.supabase.co/storage/v1/object/public/item-images/user-1/photo.jpg",
      ),
    ).toBe("user-1/photo.jpg");
    expect(
      itemImagePathFromUrl(
        "http://127.0.0.1:54321/storage/v1/object/public/item-images/u/a%20b.png",
      ),
    ).toBe("u/a b.png");
  });

  it("ignores external, malformed, or empty URLs", () => {
    expect(itemImagePathFromUrl("https://images.puma.com/x.png")).toBeNull();
    expect(itemImagePathFromUrl("not a url")).toBeNull();
    expect(itemImagePathFromUrl(null)).toBeNull();
    expect(
      itemImagePathFromUrl(
        "https://abc.supabase.co/storage/v1/object/public/other-bucket/u/x.jpg",
      ),
    ).toBeNull();
  });
});

describe("sharedLinkFromParams", () => {
  it("prefers the url param", () => {
    expect(
      sharedLinkFromParams({
        url: "https://shop.example/a",
        text: "https://other.example/b",
      }),
    ).toBe("https://shop.example/a");
  });

  it("pulls the link out of shared text", () => {
    expect(
      sharedLinkFromParams({
        text: "Check this out! https://us.puma.com/us/en/pd/catch/402744?swatch=01.",
      }),
    ).toBe("https://us.puma.com/us/en/pd/catch/402744?swatch=01");
  });

  it("ignores non-web links and plain text", () => {
    expect(sharedLinkFromParams({ url: "javascript:alert(1)" })).toBeNull();
    expect(sharedLinkFromParams({ text: "no link here" })).toBeNull();
    expect(sharedLinkFromParams({})).toBeNull();
  });
});

describe("parseTargetPrice", () => {
  it("reads dollars, rounding to cents", () => {
    expect(parseTargetPrice("40")).toEqual({ ok: true, value: 40 });
    expect(parseTargetPrice(" $1,299.999 ")).toEqual({ ok: true, value: 1300 });
  });

  it("treats blank as clearing the target", () => {
    expect(parseTargetPrice("  ")).toEqual({ ok: true, value: null });
  });

  it("rejects zero, negatives and junk", () => {
    expect(parseTargetPrice("0").ok).toBe(false);
    expect(parseTargetPrice("-5").ok).toBe(false);
    expect(parseTargetPrice("cheap").ok).toBe(false);
  });
});
