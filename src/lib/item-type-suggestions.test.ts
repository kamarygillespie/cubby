import { describe, expect, it } from "vitest";
import { suggestItemTypes } from "./item-type-suggestions";

const NAMES = [
  "Short Sleeve Blouses & Tops",
  "Long Sleeve Blouses & Tops",
  "Long Sleeve Sweaters",
  "Short Sleeve Sweaters",
  "Sports Bras",
  "Short Sleeve Active Tops",
  "Long Sleeve Active Tops",
  "Pajama Tops & Bottoms",
  "Lounge Tops & Bottoms",
  "Lounge Underwear",
  "Gym Pants",
  "Gym Tops",
  "Jackets & Coats",
  "Active Jackets",
  "Skincare",
  "Makeup",
  "Bodycare",
  "Haircare",
  "Technology",
  "Flats",
  "Boots",
  "Sneakers",
  "Loafers/Clogs",
  "Earrings",
  "Bracelets",
  "Necklaces",
  "Jewelry",
  "Misc",
];
const types = NAMES.map((name) => ({ id: name, name }));
const top = (title: string) => suggestItemTypes({ title }, types)[0]?.name;

describe("suggestItemTypes", () => {
  it.each([
    ["Speedcat OG Sneakers Women", "Sneakers"],
    ["Men's Wool Runner - Natural Grey", "Sneakers"],
    ["Cashmere Crewneck Sweater", "Long Sleeve Sweaters"],
    ["Ribbed Baby Tee", "Short Sleeve Blouses & Tops"],
    ["Classic T-Shirt", "Short Sleeve Blouses & Tops"],
    ['Align Leggings 25"', "Gym Pants"],
    ["Energy Sports Bra", "Sports Bras"],
    ["Silk Pajama Set", "Pajama Tops & Bottoms"],
    ["Heritage Leather Loafers", "Loafers/Clogs"],
    ["Chelsea Ankle Boots", "Boots"],
    ["Gold Huggie Hoops", "Earrings"],
    ["Pearl Pendant Necklace", "Necklaces"],
    ["Lip Sleeping Mask", "Skincare"],
    ["Dyson Airwrap Origin", "Haircare"],
    ["AirPods Pro 3", "Technology"],
    ["Cropped Leather Jacket", "Jackets & Coats"],
    ["Wool Trench Coat", "Jackets & Coats"],
    ["Define Jacket Nulu", "Active Jackets"],
    ["Lightweight Running Jacket", "Active Jackets"],
  ])("%s → %s", (title, expected) => {
    expect(top(title)).toBe(expected);
  });

  it("prefers the longer, more specific phrase", () => {
    expect(top("Short Sleeve Sweater")).toBe("Short Sleeve Sweaters");
    expect(top("Sports Bra")).toBe("Sports Bras");
  });

  it("matches whole words only", () => {
    expect(top("Spring Bouquet")).toBeUndefined();
    expect(top("Teenage Engineering")).toBeUndefined();
  });

  it("uses the store's category and the link when the name is vague", () => {
    expect(
      suggestItemTypes(
        { title: "The Marlow", category: "Women > Boots" },
        types,
      )[0]?.name,
    ).toBe("Boots");
    expect(
      suggestItemTypes(
        { title: "The Marlow", link: "https://shop.example/p/suede-loafers" },
        types,
      )[0]?.name,
    ).toBe("Loafers/Clogs");
  });

  it("ignores the store's domain", () => {
    expect(
      suggestItemTypes({ link: "https://boots.example/p/1234" }, types),
    ).toEqual([]);
  });

  it("returns nothing for an unknown product", () => {
    expect(suggestItemTypes({ title: "Ceramic Vase" }, types)).toEqual([]);
    expect(suggestItemTypes({}, types)).toEqual([]);
  });

  it("offers at most three, dropping weak matches", () => {
    const many = suggestItemTypes(
      { title: "Sneakers Boots Flats Loafers Earrings" },
      types,
    );
    expect(many).toHaveLength(3);
    const names = suggestItemTypes(
      {
        title: "Speedcat Sneakers",
        link: "https://shop.example/p/gift-hair-sneakers",
      },
      types,
    ).map((t) => t.name);
    expect(names).toEqual(["Sneakers"]);
  });

  it("matches custom types by name, singular or plural", () => {
    const custom = [...types, { id: "c", name: "Candles" }];
    expect(suggestItemTypes({ title: "Fig Candle" }, custom)[0]?.id).toBe("c");
    expect(suggestItemTypes({ title: "Fig Candles" }, custom)[0]?.id).toBe("c");
  });
});
