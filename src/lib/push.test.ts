import { describe, expect, it } from "vitest";
import { base64UrlToBytes, parseNotificationSettings } from "./push";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

describe("parseNotificationSettings", () => {
  it("reads checkboxes and the threshold", () => {
    expect(
      parseNotificationSettings(
        form({ price_drops: "on", min_drop_percent: "25" }),
      ),
    ).toEqual({ price_drops: true, store_sales: false, min_drop_percent: 25 });
  });

  it("clamps or defaults a bad threshold", () => {
    expect(
      parseNotificationSettings(form({ min_drop_percent: "500" }))
        .min_drop_percent,
    ).toBe(90);
    expect(
      parseNotificationSettings(form({ min_drop_percent: "0" }))
        .min_drop_percent,
    ).toBe(1);
    expect(
      parseNotificationSettings(form({ min_drop_percent: "abc" }))
        .min_drop_percent,
    ).toBe(10);
  });
});

describe("base64UrlToBytes", () => {
  it("decodes unpadded base64url", () => {
    expect([...base64UrlToBytes("_-8")]).toEqual([255, 239]);
  });
});
