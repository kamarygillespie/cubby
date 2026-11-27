import { describe, expect, it } from "vitest";
import {
  captureBookmarklet,
  captureScript,
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

// Runs the real page script against a minimal stand-in for a store's page,
// then reads back what it would hand to Add item.
function capturePage({
  ldJson,
  storeData,
  canonical = "https://shop.example/products/campus-track-pants-blue",
}: {
  ldJson: unknown;
  storeData: string;
  canonical?: string;
}) {
  const ld = JSON.stringify(ldJson);
  const location = { href: canonical };
  const document = {
    title: "",
    documentElement: { innerHTML: `<script>${ld}</script>${storeData}` },
    querySelector: (selector: string) =>
      selector === 'link[rel="canonical"]'
        ? { getAttribute: () => canonical }
        : null,
    querySelectorAll: (selector: string) =>
      selector.includes("ld+json") ? [{ textContent: ld }] : [],
  };
  new Function("document", "location", captureScript("https://cubby.example"))(
    document,
    location,
  );
  return parseCapture(new URL(location.href).searchParams.get("capture") ?? "");
}

const trackPants = {
  "@type": "ProductGroup",
  name: "Campus Track Pants",
  url: "https://shop.example/products/campus-track-pants-blue",
  hasVariant: [
    { "@type": "Product", offers: { price: 30, priceCurrency: "USD" } },
  ],
};

describe("capture script: original price from store data (KAM-74)", () => {
  it("reads compareAtPrice next to this product's price", () => {
    expect(
      capturePage({
        ldJson: trackPants,
        storeData: `{"handle":"campus-track-pants-blue","price":30,"compareAtPrice":50}`,
      }),
    ).toMatchObject({ price: 50, salePrice: 30 });
  });

  it("reads Shopify cents, JSON-escaped", () => {
    expect(
      capturePage({
        ldJson: trackPants,
        storeData: `"{\\"handle\\":\\"campus-track-pants-blue\\",\\"price\\":3000,\\"compare_at_price\\":5000}"`,
      }),
    ).toMatchObject({ price: 50, salePrice: 30 });
  });

  it("ignores a recommended product's sale at the same price", () => {
    expect(
      capturePage({
        ldJson: trackPants,
        storeData: `{"handle":"campus-track-pants-blue","price":30,"compareAtPrice":null}${" ".repeat(4000)}{"handle":"cosy-joggers-pink","price":30,"compareAtPrice":45}`,
      }),
    ).toMatchObject({ price: 30, salePrice: null });
  });

  it("gives up when original prices disagree", () => {
    expect(
      capturePage({
        ldJson: trackPants,
        storeData: `{"handle":"campus-track-pants-blue","v":[{"price":30,"compareAtPrice":50},{"price":30,"compareAtPrice":45}]}`,
      }),
    ).toMatchObject({ price: 30, salePrice: null });
  });
});
