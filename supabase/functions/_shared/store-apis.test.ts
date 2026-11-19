import { assertEquals } from "jsr:@std/assert@1";
import { bestBuySku, etsyListingId, fetchFromStoreApi } from "./store-apis.ts";

const deps = (body: unknown, env: Record<string, string>, status = 200) => {
  const calls: { url: string; headers?: HeadersInit }[] = [];
  return {
    calls,
    deps: {
      env: (name: string) => env[name],
      fetch: ((input: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(input), headers: init?.headers });
        return Promise.resolve(new Response(JSON.stringify(body), { status }));
      }) as typeof fetch,
    },
  };
};

Deno.test("finds Best Buy SKUs in both link styles", () => {
  assertEquals(
    bestBuySku(
      new URL("https://www.bestbuy.com/site/tv/6525401.p?skuId=6525401"),
    ),
    "6525401",
  );
  assertEquals(
    bestBuySku(new URL("https://www.bestbuy.com/product/tv/J7H3/sku/6525401")),
    "6525401",
  );
  assertEquals(bestBuySku(new URL("https://www.bestbuy.com/site/deals")), null);
  assertEquals(bestBuySku(new URL("https://notbestbuy.com/sku/1")), null);
});

Deno.test("finds Etsy listing ids", () => {
  assertEquals(
    etsyListingId(new URL("https://www.etsy.com/listing/470111880/a-mug")),
    "470111880",
  );
  assertEquals(etsyListingId(new URL("https://www.etsy.com/shop/maker")), null);
});

Deno.test("reads a Best Buy product and its sale", async () => {
  const fake = deps(
    {
      name: "Headphones",
      image: "https://pisces.bbystatic.com/a.jpg",
      regularPrice: 349.99,
      salePrice: 279.99,
    },
    { BESTBUY_API_KEY: "key" },
  );
  const result = await fetchFromStoreApi(
    new URL("https://www.bestbuy.com/site/x/6525401.p?skuId=6525401"),
    fake.deps,
  );
  assertEquals(result?.title, "Headphones");
  assertEquals(result?.price, 349.99);
  assertEquals(result?.salePrice, 279.99);
  assertEquals(result?.store, "Best Buy");
});

Deno.test("reads an Etsy listing's price from amount and divisor", async () => {
  const fake = deps(
    {
      title: "Hand-thrown mug",
      price: { amount: 3250, divisor: 100, currency_code: "USD" },
      images: [{ url_fullxfull: "https://i.etsystatic.com/a.jpg" }],
      shop: { shop_name: "ClayStudio" },
    },
    { ETSY_API_KEY: "key:secret" },
  );
  const result = await fetchFromStoreApi(
    new URL("https://www.etsy.com/listing/470111880/mug"),
    fake.deps,
  );
  assertEquals(result?.price, 32.5);
  assertEquals(result?.store, "ClayStudio");
  assertEquals(fake.calls[0].headers, { "x-api-key": "key:secret" });
});

Deno.test("does nothing without a key", async () => {
  const fake = deps({}, {});
  const result = await fetchFromStoreApi(
    new URL("https://www.bestbuy.com/site/x/6525401.p"),
    fake.deps,
  );
  assertEquals(result, null);
  assertEquals(fake.calls.length, 0);
});

Deno.test("falls back when the API refuses", async () => {
  const fake = deps({}, { ETSY_API_KEY: "key:secret" }, 403);
  assertEquals(
    await fetchFromStoreApi(
      new URL("https://www.etsy.com/listing/1/mug"),
      fake.deps,
    ),
    null,
  );
});
