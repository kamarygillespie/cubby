import { describe, expect, it } from "vitest";
import {
  claimMessage,
  parseClaimerName,
  parseSharedClaims,
  toClaimOutcome,
} from "./claims";

describe("parseClaimerName", () => {
  it("trims, collapses spaces and caps the length", () => {
    expect(parseClaimerName("  Aunt   May ")).toBe("Aunt May");
    expect(parseClaimerName("x".repeat(60))).toHaveLength(40);
  });

  it("treats blank or non-text as no name", () => {
    expect(parseClaimerName("   ")).toBeNull();
    expect(parseClaimerName(null)).toBeNull();
    expect(parseClaimerName(5)).toBeNull();
  });
});

describe("toClaimOutcome", () => {
  it("passes known outcomes and maps anything else to not_found", () => {
    expect(toClaimOutcome("taken")).toBe("taken");
    expect(toClaimOutcome("weird")).toBe("not_found");
    expect(toClaimOutcome(null)).toBe("not_found");
  });
});

describe("parseSharedClaims", () => {
  it("maps claims to mine/taken", () => {
    const result = parseSharedClaims({
      owner: false,
      claims: [
        { item_id: "a", mine: true },
        { item_id: "b", mine: false },
      ],
    });
    expect(result.owner).toBe(false);
    expect([...result.states]).toEqual([
      ["a", "mine"],
      ["b", "taken"],
    ]);
  });

  it("reads malformed data as no claims", () => {
    expect(parseSharedClaims(null).states.size).toBe(0);
    expect(parseSharedClaims({ claims: "nope" }).states.size).toBe(0);
    expect(
      parseSharedClaims({ claims: [null, { mine: true }] }).states.size,
    ).toBe(0);
  });

  it("flags the owner's own preview", () => {
    expect(parseSharedClaims({ owner: true, claims: [] }).owner).toBe(true);
  });
});

describe("claimMessage", () => {
  it("claimed and mine both show as yours, quietly", () => {
    expect(claimMessage("claimed")).toEqual({ state: "mine", message: null });
    expect(claimMessage("mine")).toEqual({ state: "mine", message: null });
  });

  it("explains a lost race, the limit and the owner case", () => {
    expect(claimMessage("taken").state).toBe("taken");
    expect(claimMessage("limit").state).toBe("open");
    expect(claimMessage("owner").message).toMatch(/your list/);
    expect(claimMessage("not_found").message).toMatch(/isn't on the list/);
  });
});
