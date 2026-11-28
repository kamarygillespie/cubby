import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  daysUntil,
  formatOccasionDate,
  isPast,
  localToday,
  parseOccasionDate,
} from "./occasion";

describe("occasion dates", () => {
  const today = "2026-11-27";

  it("counts calendar days, across months and years", () => {
    expect(daysUntil("2026-12-25", today)).toBe(28);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
    expect(daysUntil("2026-11-26", today)).toBe(-1);
    expect(daysUntil("nope", today)).toBeNull();
  });

  it("labels the countdown and stops once it's passed", () => {
    expect(countdownLabel("2026-12-25", today)).toBe("28 days to go");
    expect(countdownLabel("2026-11-28", today)).toBe("Tomorrow");
    expect(countdownLabel(today, today)).toBe("Today!");
    expect(countdownLabel("2026-11-01", today)).toBeNull();
    expect(isPast("2026-11-01", today)).toBe(true);
    expect(isPast(null, today)).toBe(false);
  });

  it("formats the date, adding the year only when it isn't this year", () => {
    expect(formatOccasionDate("2026-12-25", today)).toBe("Dec 25");
    expect(formatOccasionDate("2027-02-14", today)).toBe("Feb 14, 2027");
  });

  it("uses the viewer's own day", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("parses the date field", () => {
    expect(parseOccasionDate("2026-12-25")).toEqual({
      ok: true,
      value: "2026-12-25",
    });
    expect(parseOccasionDate("  ")).toEqual({ ok: true, value: null });
    expect(parseOccasionDate("2026-02-31").ok).toBe(false);
    expect(parseOccasionDate("Christmas").ok).toBe(false);
  });
});
