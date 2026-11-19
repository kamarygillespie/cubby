import { describe, expect, it } from "vitest";
import {
  captureBookmarklet,
  captureShortcutScript,
  parseCapture,
} from "./page-capture";

const encode = (data: unknown) =>
  Buffer.from(JSON.stringify(data), "utf8").toString("base64url");

describe("parseCapture", () => {
  it("reads a captured product and cleans its link", () => {
    expect(
      parseCapture(
        encode({
          l: "https://www2.hm.com/p.html?utm_source=google&size=M",
          t: "  Linen Shirt ",
          i: "https://image.hm.com/a.jpg",
          p: 40,
          s: 29.99,
          b: "H&M",
        }),
      ),
    ).toEqual({
      link: "https://www2.hm.com/p.html?size=M",
      title: "Linen Shirt",
      image: "https://image.hm.com/a.jpg",
      price: 40,
      salePrice: 29.99,
      store: "H&M",
    });
  });

  it("rejects missing or unsafe links", () => {
    expect(parseCapture(encode({ t: "No link" }))).toBeNull();
    expect(parseCapture(encode({ l: "javascript:alert(1)" }))).toBeNull();
    expect(parseCapture("not valid data")).toBeNull();
    expect(parseCapture(null)).toBeNull();
  });

  it("drops unsafe images and impossible prices", () => {
    expect(
      parseCapture(
        encode({
          l: "https://shop.example/a",
          i: "javascript:alert(1)",
          p: -5,
          s: "free",
        }),
      ),
    ).toMatchObject({ image: null, price: null, salePrice: null });
  });

  it("ignores a sale price that isn't lower", () => {
    expect(
      parseCapture(encode({ l: "https://shop.example/a", p: 40, s: 50 })),
    ).toMatchObject({ price: 40, salePrice: null });
  });

  it("refuses oversized data", () => {
    expect(parseCapture("a".repeat(12_001))).toBeNull();
  });
});

describe("capture scripts", () => {
  it("point at this Cubby and finish the right way", () => {
    expect(captureBookmarklet("https://cubby.example")).toMatch(/^javascript:/);
    expect(
      decodeURIComponent(captureBookmarklet("https://cubby.example")),
    ).toContain('"https://cubby.example"');
    expect(
      decodeURIComponent(captureBookmarklet("https://cubby.example")),
    ).toContain("window.open(target,'_blank')");
    expect(captureShortcutScript("https://cubby.example")).toContain(
      "completion(target)",
    );
  });
});
