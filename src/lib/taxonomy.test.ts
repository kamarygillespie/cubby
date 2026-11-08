import { describe, expect, it } from "vitest";
import {
  TAXONOMY_NAME_MAX_LENGTH,
  parseTaxonomyName,
  taxonomyErrorMessage,
} from "./taxonomy";

describe("parseTaxonomyName", () => {
  it("trims and collapses whitespace", () => {
    expect(parseTaxonomyName("  Rain   boots ")).toEqual({
      ok: true,
      name: "Rain boots",
    });
  });

  it("rejects blank and over-long names", () => {
    expect(parseTaxonomyName("  ").ok).toBe(false);
    expect(parseTaxonomyName("x".repeat(TAXONOMY_NAME_MAX_LENGTH)).ok).toBe(
      true,
    );
    expect(parseTaxonomyName("x".repeat(TAXONOMY_NAME_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });
});

describe("taxonomyErrorMessage", () => {
  it("explains duplicates and in-use deletes", () => {
    expect(taxonomyErrorMessage({ code: "23505" }, "item type")).toMatch(
      /already have/,
    );
    expect(taxonomyErrorMessage({ code: "23503" }, "item type")).toMatch(
      /Items still use/,
    );
    expect(taxonomyErrorMessage({ code: "23503" }, "category")).toMatch(
      /still has item types/,
    );
    expect(taxonomyErrorMessage(new Error("x"), "category")).toMatch(
      /Couldn't save/,
    );
  });
});
