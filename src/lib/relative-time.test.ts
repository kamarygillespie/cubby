import { describe, expect, it } from "vitest";
import { formatTimeAgo } from "./relative-time";

const now = new Date("2026-11-09T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("formatTimeAgo", () => {
  it("formats recent times compactly", () => {
    expect(formatTimeAgo(ago(20_000), now)).toBe("just now");
    expect(formatTimeAgo(ago(5 * 60_000), now)).toBe("5m ago");
    expect(formatTimeAgo(ago(3 * 3_600_000), now)).toBe("3h ago");
    expect(formatTimeAgo(ago(2 * 86_400_000), now)).toBe("2d ago");
  });

  it("falls back to a date after a month", () => {
    expect(formatTimeAgo("2026-09-01T12:00:00Z", now)).toBe("Sep 1");
  });

  it("handles missing or invalid input", () => {
    expect(formatTimeAgo(null, now)).toBeNull();
    expect(formatTimeAgo("not a date", now)).toBeNull();
  });
});
