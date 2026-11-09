import { describe, expect, it } from "vitest";
import {
  lastMonthKeys,
  monthLabel,
  purchaseYears,
  spendingByMonth,
  undatedSpending,
  yearMonthKeys,
  type Purchase,
} from "./spending";

const utcKey = (iso: string) => iso.slice(0, 7);
const p = (
  id: string,
  date: string | null,
  amount: number,
  category = "Clothing",
): Purchase => ({
  id,
  title: id,
  date,
  amount,
  category,
});

describe("month keys", () => {
  it("lists the last 12 months ending this month, across a year boundary", () => {
    const keys = lastMonthKeys(new Date(2026, 2, 15));
    expect(keys[0]).toBe("2025-04");
    expect(keys.at(-1)).toBe("2026-03");
    expect(keys).toHaveLength(12);
  });
  it("lists a calendar year", () => {
    expect(yearMonthKeys(2026)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });
});

describe("spendingByMonth", () => {
  const purchases = [
    p("boots", "2026-10-10T12:00:00Z", 230, "Shoes"),
    p("balm", "2026-10-20T12:00:00Z", 18, "Beauty"),
    p("coat", "2026-10-25T12:00:00Z", 120.5, "Clothing"),
    p("tee", "2026-08-01T12:00:00Z", 30),
    p("old", "2024-01-01T12:00:00Z", 99), // outside the range
    p("nodate", null, 40),
  ];
  const months = spendingByMonth(purchases, yearMonthKeys(2026), utcKey);

  it("totals each month, keeps empty months", () => {
    expect(months).toHaveLength(12);
    expect(months.map((m) => m.total)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 30, 0, 368.5, 0, 0,
    ]);
    expect(months[9].count).toBe(3);
  });

  it("breaks a month down by category, biggest first", () => {
    expect(months[9].byCategory).toEqual([
      { category: "Shoes", total: 230, count: 1 },
      { category: "Clothing", total: 120.5, count: 1 },
      { category: "Beauty", total: 18, count: 1 },
    ]);
  });

  it("lists a month's purchases newest first", () => {
    expect(months[9].purchases.map((x) => x.id)).toEqual([
      "coat",
      "balm",
      "boots",
    ]);
  });

  it("keeps undated purchases in their own bucket", () => {
    expect(undatedSpending(purchases)).toEqual({ total: 40, count: 1 });
  });

  it("lists years with purchases, newest first", () => {
    expect(purchaseYears(purchases, utcKey)).toEqual([2026, 2024]);
  });
});

describe("monthLabel", () => {
  it("formats short and long labels", () => {
    expect(monthLabel("2026-10")).toBe("Oct");
    expect(monthLabel("2026-10", "long")).toBe("October 2026");
  });
});
