import { describe, expect, it } from "vitest";
import { pricePoints, summarizePrices } from "./price-history";

const check = (
  day: number,
  price: number | null,
  sale: number | null = null,
) => ({
  checked_at: `2026-11-${String(day).padStart(2, "0")}T12:00:00Z`,
  price,
  sale_price: sale,
});

describe("pricePoints", () => {
  it("uses the price paid, drops unreadable checks and flat repeats", () => {
    expect(
      pricePoints([
        check(5, 50),
        check(1, 50),
        check(2, 50),
        check(3, null),
        check(4, 50, 30),
        check(6, 50, 30),
      ]),
    ).toEqual([
      { at: "2026-11-01T12:00:00Z", price: 50 },
      { at: "2026-11-04T12:00:00Z", price: 30 },
      { at: "2026-11-05T12:00:00Z", price: 50 },
      { at: "2026-11-06T12:00:00Z", price: 30 },
    ]);
  });

  it("ignores a sale price that isn't lower", () => {
    expect(pricePoints([check(1, 40, 45)])).toEqual([
      { at: "2026-11-01T12:00:00Z", price: 40 },
    ]);
  });
});

describe("summarizePrices", () => {
  it("finds the low, the high and whether now is the lowest", () => {
    const points = pricePoints([
      check(1, 50),
      check(4, 50, 25),
      check(9, 50, 30),
    ]);
    expect(summarizePrices(points)).toEqual({
      now: 30,
      low: 25,
      lowAt: "2026-11-04T12:00:00Z",
      high: 50,
      atLowest: false,
    });
    expect(
      summarizePrices(pricePoints([check(1, 50), check(2, 50, 20)]))?.atLowest,
    ).toBe(true);
  });

  it("needs two points", () => {
    expect(summarizePrices(pricePoints([check(1, 50)]))).toBeNull();
  });
});
