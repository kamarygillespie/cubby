import { describe, expect, it } from "vitest";
import { applyPriceCheck, summarizePriceChecks } from "./price-check";

describe("applyPriceCheck", () => {
  it("detects a new sale (the PUMA case)", () => {
    expect(
      applyPriceCheck(
        { price: 73, sale_price: null },
        { price: 73, salePrice: 49.99 },
      ),
    ).toEqual({
      outcome: "now_on_sale",
      message: "Now on sale: $49.99 (was $73.00).",
      update: { price: 73, sale_price: 49.99 },
    });
  });

  it("reports no change and doesn't write", () => {
    expect(
      applyPriceCheck(
        { price: 73, sale_price: 49.99 },
        { price: 73, salePrice: 49.99 },
      ),
    ).toMatchObject({ outcome: "unchanged", update: null });
  });

  it("detects a sale ending and clears the sale price", () => {
    expect(
      applyPriceCheck(
        { price: 73, sale_price: 49.99 },
        { price: 73, salePrice: null },
      ),
    ).toMatchObject({
      outcome: "sale_ended",
      message: "Sale ended: back to $73.00.",
      update: { price: 73, sale_price: null },
    });
  });

  it("detects deeper discounts and plain price changes", () => {
    expect(
      applyPriceCheck(
        { price: 73, sale_price: 49.99 },
        { price: 73, salePrice: 39.99 },
      ),
    ).toMatchObject({
      outcome: "price_dropped",
      message: "Price dropped to $39.99 (was $49.99).",
    });
    expect(
      applyPriceCheck(
        { price: 100, sale_price: null },
        { price: 90, salePrice: null },
      ),
    ).toMatchObject({ outcome: "price_dropped" });
    expect(
      applyPriceCheck(
        { price: 100, sale_price: null },
        { price: 110, salePrice: null },
      ),
    ).toMatchObject({
      outcome: "price_rose",
      message: "Price went up to $110.00 (was $100.00).",
    });
  });

  it("never wipes a known price when the page can't be read", () => {
    expect(
      applyPriceCheck(
        { price: 73, sale_price: 49.99 },
        { price: null, salePrice: null },
      ),
    ).toMatchObject({ outcome: "unreadable", update: null });
  });

  it("fills a price for an item that had none", () => {
    expect(
      applyPriceCheck(
        { price: null, sale_price: null },
        { price: 25, salePrice: null },
      ),
    ).toMatchObject({
      outcome: "updated",
      update: { price: 25, sale_price: null },
    });
  });

  it("ignores a 'sale' price that isn't lower", () => {
    expect(
      applyPriceCheck(
        { price: 50, sale_price: null },
        { price: 50, salePrice: 50 },
      ),
    ).toMatchObject({ outcome: "unchanged" });
  });
});

describe("summarizePriceChecks", () => {
  it("summarizes outcomes with plurals", () => {
    expect(
      summarizePriceChecks([
        "now_on_sale",
        "now_on_sale",
        "price_dropped",
        "unchanged",
        "unreadable",
      ]),
    ).toBe("2 now on sale, 1 price drop, 1 unchanged, 1 couldn't be read.");
    expect(summarizePriceChecks([])).toBe("Nothing to check.");
  });
});
