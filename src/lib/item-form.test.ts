import { describe, expect, it } from "vitest";
import { itemImagePathFromUrl, parseItemForm } from "./item-form";

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
