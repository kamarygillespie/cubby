import { describe, expect, it } from "vitest";
import {
  autoMapColumns,
  itemsToCsv,
  parseImportRow,
  readImportFile,
  statusOf,
  type ExportItem,
} from "./item-transfer";

const item = (o: Partial<ExportItem>): ExportItem => ({
  title: "Boots",
  source: "wishlist",
  purchased: false,
  gifted: false,
  archived_at: null,
  item_type: { name: "Boots", category: { name: "Shoes" } },
  store_brand: "Madewell",
  price: 200,
  sale_price: 150,
  interest_level: 5,
  link: "https://shop.example/boots",
  image_url:
    "https://x.supabase.co/storage/v1/object/public/item-images/u/a.jpg",
  notes: "- size 8",
  purchased_date: null,
  created_at: "2026-03-01T10:00:00Z",
  ...o,
});

describe("statusOf", () => {
  it("names each state", () => {
    expect(statusOf(item({}))).toBe("wishlist");
    expect(statusOf(item({ purchased: true }))).toBe("purchased");
    expect(statusOf(item({ gifted: true }))).toBe("gift_received");
    expect(statusOf(item({ purchased: true, gifted: true }))).toBe(
      "bought_as_gift",
    );
    expect(statusOf(item({ source: "closet" }))).toBe("closet");
    expect(statusOf(item({ archived_at: "2026-11-01T00:00:00Z" }))).toBe(
      "archived",
    );
  });
});

describe("export then import", () => {
  it("round-trips every field Cubby can import", () => {
    const csv = itemsToCsv([
      item({}),
      item({
        title: "Tee",
        purchased: true,
        purchased_date: "2026-05-02T00:00:00Z",
        sale_price: null,
        notes: null,
      }),
    ]);
    const { rows, map } = readImportFile(csv);
    expect(rows).toHaveLength(2);
    expect(parseImportRow(rows[0], map)).toEqual({
      ok: true,
      value: {
        title: "Boots",
        status: "wishlist",
        itemType: "Boots",
        store: "Madewell",
        price: 200,
        salePrice: 150,
        interest: 5,
        link: "https://shop.example/boots",
        image:
          "https://x.supabase.co/storage/v1/object/public/item-images/u/a.jpg",
        notes: "- size 8",
        purchasedOn: null,
      },
    });
    expect(parseImportRow(rows[1], map)).toMatchObject({
      ok: true,
      value: {
        title: "Tee",
        status: "purchased",
        salePrice: null,
        notes: null,
        purchasedOn: "2026-05-02",
      },
    });
  });
});

describe("importing other files", () => {
  it("guesses columns from common names, in any order", () => {
    expect(
      autoMapColumns(["URL", "Product", "Cost", "Brand", "Rating", "Whatever"]),
    ).toEqual({ link: 0, title: 1, price: 2, store: 3, interest: 4 });
  });

  it("reads loose values and explains bad rows", () => {
    const map = { title: 0, price: 1, interest: 2, status: 3, link: 4 };
    expect(
      parseImportRow(["  Lamp ", "$1,299.50", "4", "bought", "not a url"], map),
    ).toMatchObject({
      ok: true,
      value: {
        title: "Lamp",
        price: 1299.5,
        interest: 4,
        status: "purchased",
        link: null,
      },
    });
    expect(parseImportRow(["", "10"], map)).toEqual({
      ok: false,
      error: "No title",
    });
    expect(parseImportRow(["Lamp", "ten"], map)).toEqual({
      ok: false,
      error: "Price isn't a number",
    });
    expect(parseImportRow(["Lamp", "", "9"], map)).toEqual({
      ok: false,
      error: "Interest must be 1 to 5",
    });
    expect(parseImportRow(["Lamp", "", "", "lost"], map)).toEqual({
      ok: false,
      error: 'Unknown status "lost"',
    });
  });

  it("drops a sale price that isn't lower", () => {
    expect(
      parseImportRow(["Lamp", "50", "60"], {
        title: 0,
        price: 1,
        sale_price: 2,
      }),
    ).toMatchObject({ ok: true, value: { price: 50, salePrice: null } });
  });
});
