import { assertEquals } from "jsr:@std/assert@1";
import {
  extractFromHtml,
  parsePrice,
  resolvePrices,
  storeFromHostname,
} from "./extract.ts";

Deno.test("extracts Open Graph title and image when present", () => {
  const html = `
    <html><head>
      <meta property="og:title" content="Cozy Wool Sweater">
      <meta property="og:image" content="https://example.com/sweater.jpg">
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Cozy Wool Sweater");
  assertEquals(result.image, "https://example.com/sweater.jpg");
  assertEquals(result.price, null);
});

Deno.test("extracts schema.org Product name, image, and price", () => {
  const html = `
    <html><head>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Cozy Wool Sweater",
          "image": "https://example.com/sweater.jpg",
          "offers": { "@type": "Offer", "price": "59.99", "priceCurrency": "USD" }
        }
      </script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Cozy Wool Sweater");
  assertEquals(result.image, "https://example.com/sweater.jpg");
  assertEquals(result.price, 59.99);
});

Deno.test("finds a Product node nested inside an @graph array", () => {
  const html = `
    <html><head>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", "name": "Not this one" },
            { "@type": "Product", "name": "Graph Product", "offers": { "price": "10" } }
          ]
        }
      </script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Graph Product");
  assertEquals(result.price, 10);
});

Deno.test("prefers schema.org over Open Graph when both are present", () => {
  const html = `
    <html><head>
      <meta property="og:title" content="OG Title">
      <script type="application/ld+json">
        { "@type": "Product", "name": "Schema Title", "offers": { "price": "20" } }
      </script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Schema Title");
});

Deno.test("falls back to Open Graph product price meta tags", () => {
  const html = `
    <html><head>
      <meta property="og:title" content="Sale Item">
      <meta property="product:price:amount" content="40.00">
      <meta property="product:sale_price:amount" content="29.99">
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.price, 40);
  assertEquals(result.salePrice, 29.99);
});

Deno.test("returns all-null result for a page with no structured data", () => {
  const result = extractFromHtml(
    "<html><head><title>Plain page</title></head></html>",
  );
  assertEquals(result, {
    title: null,
    image: null,
    price: null,
    salePrice: null,
    store: null,
    category: null,
    blocked: false,
    inStock: null,
    sizes: [],
  });
});

Deno.test("gracefully ignores malformed JSON-LD", () => {
  const html = `
    <html><head>
      <meta property="og:title" content="Fallback Title">
      <script type="application/ld+json">{ not valid json </script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Fallback Title");
});

Deno.test("parsePrice strips currency symbols and formatting", () => {
  assertEquals(parsePrice("$59.99"), 59.99);
  assertEquals(parsePrice("1,234.56"), 1234.56);
  assertEquals(parsePrice(""), null);
  assertEquals(parsePrice(null), null);
  assertEquals(parsePrice("free"), null);
});

const ldPage = (json: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(
    json,
  )}</script></head></html>`;

// Shape taken from a real PUMA product page (Kamary's report): the offer's
// `price` is the sale price and the original sits in a StrikethroughPrice
// priceSpecification. Previously this came back as price 49.99, no sale.
Deno.test(
  "schema.org StrikethroughPrice: original becomes price, current becomes sale price",
  () => {
    const result = extractFromHtml(
      ldPage({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Catch Soleil Women's Sneakers",
        offers: {
          "@type": "Offer",
          price: 49.99,
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceType: "https://schema.org/StrikethroughPrice",
            price: 73,
            priceCurrency: "USD",
          },
        },
      }),
    );
    assertEquals(result.price, 73);
    assertEquals(result.salePrice, 49.99);
  },
);

Deno.test("schema.org ListPrice inside a priceSpecification array", () => {
  const result = extractFromHtml(
    ldPage({
      "@type": "Product",
      name: "Boots",
      offers: [
        {
          price: "150.00",
          priceSpecification: [
            { priceType: "https://schema.org/SalePrice", price: "150.00" },
            { priceType: "ListPrice", price: "200.00" },
          ],
        },
      ],
    }),
  );
  assertEquals(result.price, 200);
  assertEquals(result.salePrice, 150);
});

Deno.test(
  "an original price that isn't higher is ignored (not on sale)",
  () => {
    const same = extractFromHtml(
      ldPage({
        "@type": "Product",
        offers: {
          price: 60,
          priceSpecification: { priceType: "StrikethroughPrice", price: 60 },
        },
      }),
    );
    assertEquals([same.price, same.salePrice], [60, null]);

    const lower = extractFromHtml(
      ldPage({
        "@type": "Product",
        offers: {
          price: 60,
          priceSpecification: { priceType: "StrikethroughPrice", price: 40 },
        },
      }),
    );
    assertEquals([lower.price, lower.salePrice], [60, null]);
  },
);

Deno.test("AggregateOffer uses lowPrice as the current price", () => {
  const result = extractFromHtml(
    ldPage({
      "@type": "Product",
      offers: { "@type": "AggregateOffer", lowPrice: "35", highPrice: "55" },
    }),
  );
  assertEquals([result.price, result.salePrice], [35, null]);
});

Deno.test("Open Graph product:original_price marks a sale", () => {
  const result = extractFromHtml(`
    <html><head>
      <meta property="og:price:amount" content="49.99">
      <meta property="product:original_price:amount" content="73.00">
    </head></html>
  `);
  assertEquals([result.price, result.salePrice], [73, 49.99]);
});

Deno.test("Open Graph og:price:amount alone is the regular price", () => {
  const result = extractFromHtml(
    `<html><head><meta property="og:price:amount" content="$25.00"></head></html>`,
  );
  assertEquals([result.price, result.salePrice], [25, null]);
});

Deno.test("schema.org current price + OG original price combine", () => {
  const result = extractFromHtml(`
    <html><head>
      <meta property="product:original_price:amount" content="90">
      <script type="application/ld+json">
        { "@type": "Product", "offers": { "price": "63" } }
      </script>
    </head></html>
  `);
  assertEquals([result.price, result.salePrice], [90, 63]);
});

Deno.test("resolvePrices", () => {
  assertEquals(resolvePrices({ current: 49.99, original: 73 }), {
    price: 73,
    salePrice: 49.99,
  });
  assertEquals(resolvePrices({ current: 50, original: null }), {
    price: 50,
    salePrice: null,
  });
  assertEquals(resolvePrices({ current: null, original: 80 }), {
    price: 80,
    salePrice: null,
  });
  assertEquals(resolvePrices({ current: null, original: null }), {
    price: null,
    salePrice: null,
  });
});

Deno.test("reads the brand and category from schema.org", () => {
  const html = `
    <html><head>
      <meta property="og:site_name" content="Nordstrom">
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Speedcat",
          "brand": { "@type": "Brand", "name": "PUMA" },
          "category": "Women > Shoes > Sneakers"
        }
      </script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.store, "PUMA");
  assertEquals(result.category, "Women > Shoes > Sneakers");
});

Deno.test("falls back to the site name, without its tagline", () => {
  const html = `
    <html><head>
      <meta property="og:title" content="Speedcat">
      <meta property="og:site_name" content="Madewell | Official Site">
    </head></html>
  `;
  assertEquals(extractFromHtml(html).store, "Madewell");
});

Deno.test("names a store from its web address", () => {
  assertEquals(storeFromHostname("us.puma.com"), "PUMA");
  assertEquals(storeFromHostname("www2.hm.com"), "H&M");
  assertEquals(storeFromHostname("oldnavy.gap.com"), "Old Navy");
  assertEquals(storeFromHostname("www.allbirds.com"), "Allbirds");
  assertEquals(storeFromHostname("shop.example.co.uk"), "Example");
  assertEquals(storeFromHostname("localhost"), null);
});

Deno.test("reads the price from a ProductGroup's first variant", () => {
  const html = `
    <html><head>
      <script type="application/ld+json">{"@type":"Product","@id":"#awards"}</script>
      <script type="application/ld+json">
        {
          "@type": "ProductGroup",
          "name": "Revealer Concealer",
          "brand": { "name": "Kosas" },
          "hasVariant": [
            {
              "@type": "Product",
              "image": "https://example.com/tone.jpg",
              "offers": { "@type": "Offer", "price": "32.00" }
            }
          ]
        }
      </script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Revealer Concealer");
  assertEquals(result.price, 32);
  assertEquals(result.image, "https://example.com/tone.jpg");
  assertEquals(result.store, "Kosas");
});

Deno.test("reads a price nested inside an aggregate offer", () => {
  const html = `
    <html><head><script type="application/ld+json">
      {
        "@type": "Product",
        "name": "Tee",
        "offers": {
          "@type": "AggregateOffer",
          "offers": [{ "@type": "Offer", "price": "28.00" }]
        }
      }
    </script></head></html>
  `;
  assertEquals(extractFromHtml(html).price, 28);
});

Deno.test(
  "uses a store's stated US price over mislabeled home-currency prices",
  () => {
    const html = `
    <html><head>
      <meta property="product:price:amount" content="39.68" />
      <meta property="product:price:currency" content="GBP" />
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Chunky Knit Sweater",
          "offers": [{ "@type": "Offer", "priceCurrency": "USD", "price": 31.74 }]
        }
      </script>
    </head><body><script>
      self.__data = {"currency_code":"GBP","marketing":{"sale_price_usd":41.93},
      "discount_price_list":[{"type":0,"sale_price":31.74}]};
    </script></body></html>
  `;
    const result = extractFromHtml(html);
    assertEquals(result.salePrice, 41.93);
    assertEquals(result.price, 52.42);
  },
);

Deno.test("doesn't show another currency as dollars", () => {
  const html = `
    <html><head><script type="application/ld+json">
      {
        "@type": "Product",
        "name": "Wool Scarf",
        "offers": { "@type": "Offer", "priceCurrency": "GBP", "price": "45.00" }
      }
    </script></head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.title, "Wool Scarf");
  assertEquals(result.price, null);
  assertEquals(result.salePrice, null);
});

Deno.test("keeps US dollar prices as they are", () => {
  const html = `
    <html><head>
      <meta property="product:price:currency" content="USD" />
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Tee",
          "offers": { "@type": "Offer", "priceCurrency": "USD", "price": "28.00" }
        }
      </script>
    </head></html>
  `;
  assertEquals(extractFromHtml(html).price, 28);
});

// KAM-74: the original price in a store's own page data (Gymshark/Shopify).
const storePage = (storeData: string) => `
  <html><head>
    <link rel="canonical" href="https://shop.example/products/campus-track-pants-blue" />
    <script type="application/ld+json">
      {
        "@type": "ProductGroup",
        "name": "Campus Track Pants",
        "url": "https://shop.example/products/campus-track-pants-blue",
        "productGroupID": "6806718316746",
        "hasVariant": [{ "@type": "Product", "offers": { "@type": "Offer", "price": 30, "priceCurrency": "USD" } }]
      }
    </script>
  </head><body>
    <script id="__NEXT_DATA__" type="application/json">${storeData}</script>
  </body></html>
`;

Deno.test("reads compareAtPrice next to this product's current price", () => {
  const result = extractFromHtml(
    storePage(
      `{"product":{"handle":"campus-track-pants-blue","price":30,"compareAtPrice":50,"discountPercentage":40}}`,
    ),
  );
  assertEquals(result.price, 50);
  assertEquals(result.salePrice, 30);
});

Deno.test("a full-price product isn't marked on sale", () => {
  const result = extractFromHtml(
    storePage(
      `{"product":{"handle":"campus-track-pants-blue","price":30,"compareAtPrice":null}}`,
    ),
  );
  assertEquals(result.price, 30);
  assertEquals(result.salePrice, null);
});

Deno.test("an original price equal to the current one isn't a sale", () => {
  const result = extractFromHtml(
    storePage(
      `{"product":{"handle":"campus-track-pants-blue","price":30,"compareAtPrice":30}}`,
    ),
  );
  assertEquals(result.salePrice, null);
});

Deno.test("ignores a sale on a recommended product at the same price", () => {
  const filler = " ".repeat(4000);
  const result = extractFromHtml(
    storePage(
      `{"product":{"handle":"campus-track-pants-blue","price":30,"compareAtPrice":null},${filler}"recommended":[{"handle":"cosy-joggers-pink","price":30,"compareAtPrice":45}]}`,
    ),
  );
  assertEquals(result.price, 30);
  assertEquals(result.salePrice, null);
});

Deno.test("gives up rather than guess when original prices disagree", () => {
  const result = extractFromHtml(
    storePage(
      `{"handle":"campus-track-pants-blue","variants":[{"price":30,"compareAtPrice":50},{"price":30,"compareAtPrice":45}]}`,
    ),
  );
  assertEquals(result.price, 30);
  assertEquals(result.salePrice, null);
});

Deno.test("reads Shopify compare_at_price in cents, even JSON-escaped", () => {
  const result = extractFromHtml(
    storePage(
      `"{\\"id\\":6806718316746,\\"price\\":3000,\\"compare_at_price\\":5000}"`,
    ),
  );
  assertEquals(result.price, 50);
  assertEquals(result.salePrice, 30);
});

Deno.test("schema.org's own original price still wins", () => {
  const html = `
    <html><head>
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Tee",
          "offers": {
            "@type": "Offer", "price": "20", "priceCurrency": "USD",
            "priceSpecification": { "priceType": "https://schema.org/ListPrice", "price": "40" }
          }
        }
      </script>
      <script>{"price":20,"compareAtPrice":35}</script>
    </head></html>
  `;
  const result = extractFromHtml(html);
  assertEquals(result.price, 40);
  assertEquals(result.salePrice, 20);
});

Deno.test(
  "uses the price closest to the original price, not the first nearby",
  () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Tee","url":"https://shop.example/products/plain-tee","offers":{"price":30,"priceCurrency":"USD"}}</script><script>{"handle":"plain-tee","price":3000,"compare_at_price":5000}</script>`;
    const result = extractFromHtml(html);
    assertEquals(result.price, 50);
    assertEquals(result.salePrice, 30);
  },
);
