import { describe, expect, it } from "vitest";
import { closetOrigin, isInCloset } from "./closet";

const item = (source: string, purchased: boolean, gifted: boolean) => ({
  source,
  purchased,
  gifted,
});

describe("isInCloset", () => {
  it("includes added pieces, things you bought, and gifts you received", () => {
    expect(isInCloset(item("closet", false, false))).toBe(true);
    expect(isInCloset(item("wishlist", true, false))).toBe(true);
    expect(isInCloset(item("wishlist", false, true))).toBe(true);
  });

  it("excludes wishes and things bought as gifts for others", () => {
    expect(isInCloset(item("wishlist", false, false))).toBe(false);
    expect(isInCloset(item("wishlist", true, true))).toBe(false);
  });
});

describe("closetOrigin", () => {
  it("labels where a piece came from", () => {
    expect(closetOrigin(item("closet", false, false))).toBe("added");
    expect(closetOrigin(item("wishlist", true, false))).toBe("bought");
    expect(closetOrigin(item("wishlist", false, true))).toBe("gift");
  });
});
