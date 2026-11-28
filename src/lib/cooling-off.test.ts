import { describe, expect, it } from "vitest";
import { isCheckInCandidate, showCheckInBanner } from "./cooling-off";

const now = new Date("2026-11-27T12:00:00Z");
const base = {
  created_at: "2026-08-01T00:00:00Z", // ~118 days ago
  interest_level: 2,
  purchased: false,
  gifted: false,
  archived_at: null,
  kept_at: null,
};

describe("isCheckInCandidate", () => {
  it("asks about older, lukewarm wishlist items", () => {
    expect(isCheckInCandidate(base, now)).toBe(true);
    expect(isCheckInCandidate({ ...base, interest_level: null }, now)).toBe(
      true,
    );
    expect(isCheckInCandidate({ ...base, interest_level: 3 }, now)).toBe(true);
  });

  it("skips new, loved, bought, archived or recently kept items", () => {
    expect(
      isCheckInCandidate({ ...base, created_at: "2026-10-15T00:00:00Z" }, now),
    ).toBe(false);
    expect(isCheckInCandidate({ ...base, interest_level: 4 }, now)).toBe(false);
    expect(isCheckInCandidate({ ...base, purchased: true }, now)).toBe(false);
    expect(isCheckInCandidate({ ...base, gifted: true }, now)).toBe(false);
    expect(
      isCheckInCandidate({ ...base, archived_at: "2026-11-01T00:00:00Z" }, now),
    ).toBe(false);
    expect(
      isCheckInCandidate({ ...base, kept_at: "2026-10-01T00:00:00Z" }, now),
    ).toBe(false);
    // Kept long enough ago: asked again.
    expect(
      isCheckInCandidate({ ...base, kept_at: "2026-07-01T00:00:00Z" }, now),
    ).toBe(true);
  });
});

describe("showCheckInBanner", () => {
  const on = { candidates: 3, enabled: true, dismissedAt: null, now };

  it("shows when there's something to review", () => {
    expect(showCheckInBanner(on)).toBe(true);
    expect(showCheckInBanner({ ...on, candidates: 0 })).toBe(false);
    expect(showCheckInBanner({ ...on, enabled: false })).toBe(false);
  });

  it("stays hidden for the rest of the month once dismissed", () => {
    expect(
      showCheckInBanner({ ...on, dismissedAt: "2026-11-03T00:00:00Z" }),
    ).toBe(false);
    expect(
      showCheckInBanner({ ...on, dismissedAt: "2026-10-30T00:00:00Z" }),
    ).toBe(true);
  });
});
