import { describe, expect, it } from "vitest";
import { splitEvenly, splitSpread } from "./even-split";

const items = (...prices: (number | null)[]) =>
  prices.map((price, i) => ({ id: `i${String(i).padStart(2, "0")}`, price }));

describe("splitEvenly", () => {
  it("balances totals across lists", () => {
    const lists = splitEvenly(items(100, 90, 60, 50, 40, 30, 20, 10), 2);
    expect(lists.map((l) => l.total)).toEqual([200, 200]);
    expect(splitSpread(lists)).toBe(0);
  });

  it("beats plain round-robin on a skewed list", () => {
    const prices = [300, 50, 50, 50, 50, 50, 50];
    const greedy = splitSpread(splitEvenly(items(...prices), 2));
    // Round-robin by sorted price: [300,50,50,50] vs [50,50,50] = 450 vs 150.
    expect(greedy).toBeLessThan(300);
    expect(greedy).toBe(0); // 300 vs 6×50
  });

  it("is deterministic", () => {
    const input = items(40, 40, 40, 20, 20, 10);
    expect(splitEvenly(input, 3)).toEqual(splitEvenly([...input].reverse(), 3));
  });

  it("handles fewer items than lists", () => {
    const lists = splitEvenly(items(50), 3);
    expect(lists.map((l) => l.count)).toEqual([1, 0, 0]);
  });

  it("spreads unpriced items by count, after priced ones", () => {
    const lists = splitEvenly(items(100, 100, null, null, 0), 2);
    expect(lists.map((l) => l.total)).toEqual([100, 100]);
    expect(lists.map((l) => l.count).sort()).toEqual([2, 3]);
  });

  it("keeps every item exactly once", () => {
    const input = items(5, 9, 3, 7, null, 12, 1, 8, 4);
    const ids = splitEvenly(input, 4).flatMap((l) => l.itemIds);
    expect(ids.sort()).toEqual(input.map((i) => i.id).sort());
  });

  it("rejects a bad list count", () => {
    expect(() => splitEvenly(items(1), 0)).toThrow();
  });
});

describe("splitting into lists that already have items (KAM-103)", () => {
  it("fills the list that's behind first", () => {
    const lists = splitEvenly(
      [
        { id: "a", price: 30 },
        { id: "b", price: 20 },
        { id: "c", price: 10 },
      ],
      2,
      [
        { total: 100, count: 4 },
        { total: 60, count: 2 },
      ],
    );
    // $30 → the $60 list (now $90); $20 → still the lower one ($90 → $110);
    // $10 → the $100 list ($110). Both end at $110.
    expect(lists[1].itemIds).toEqual(["a", "b"]);
    expect(lists[0].itemIds).toEqual(["c"]);
    expect(lists.map((l) => l.total)).toEqual([110, 110]);
    expect(lists.map((l) => l.count)).toEqual([5, 4]);
  });

  it("puts everything on the far-behind list when that keeps it even", () => {
    const lists = splitEvenly(
      [
        { id: "a", price: 15 },
        { id: "b", price: 10 },
      ],
      2,
      [
        { total: 200, count: 5 },
        { total: 50, count: 1 },
      ],
    );
    expect(lists[0].itemIds).toEqual([]);
    expect(lists[1].itemIds).toEqual(["a", "b"]);
  });

  it("without starting totals, behaves as before", () => {
    const fresh = splitEvenly(
      [
        { id: "a", price: 10 },
        { id: "b", price: 10 },
      ],
      2,
    );
    expect(fresh.map((l) => l.itemIds)).toEqual([["a"], ["b"]]);
  });
});
