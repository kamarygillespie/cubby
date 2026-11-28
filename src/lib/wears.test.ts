import { describe, expect, it } from "vitest";
import { costPerWear, parseWearSort, sortByWear, wearLabel } from "./wears";

describe("cost per wear", () => {
  it("divides the price by wears, rounded to cents", () => {
    expect(costPerWear(120, 24)).toBe(5);
    expect(costPerWear(100, 3)).toBe(33.33);
    expect(costPerWear(null, 3)).toBeNull();
    expect(costPerWear(50, 0)).toBeNull();
  });

  it("labels wears, with the cost only when there's a price", () => {
    expect(wearLabel(120, 24)).toBe("Worn 24× · $5.00/wear");
    expect(wearLabel(40, 1)).toBe("Worn once · $40.00/wear");
    expect(wearLabel(null, 3)).toBe("Worn 3×");
    expect(wearLabel(80, 0)).toBe("Not worn yet");
  });
});

describe("sortByWear", () => {
  const coat = { id: "coat", price: 300 };
  const tee = { id: "tee", price: 20 };
  const gift = { id: "gift", price: null };
  const boots = { id: "boots", price: 200 };
  const wears = new Map([
    ["coat", 30], // $10/wear
    ["tee", 4], // $5/wear
    ["gift", 10],
  ]);
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

  it("sorts by wears either way", () => {
    expect(
      ids(sortByWear([tee, coat, gift, boots], wears, "most_worn")),
    ).toEqual(["coat", "gift", "tee", "boots"]);
    expect(
      ids(sortByWear([tee, coat, gift, boots], wears, "least_worn")),
    ).toEqual(["boots", "tee", "gift", "coat"]);
  });

  it("best value puts the lowest cost per wear first, unpriced or unworn last", () => {
    expect(
      ids(sortByWear([coat, gift, boots, tee], wears, "best_value")),
    ).toEqual(["tee", "coat", "gift", "boots"]);
  });

  it("keeps the order with no sort, and reads only known sorts", () => {
    expect(ids(sortByWear([tee, coat], wears, null))).toEqual(["tee", "coat"]);
    expect(parseWearSort("best_value")).toBe("best_value");
    expect(parseWearSort("random")).toBeNull();
  });
});
