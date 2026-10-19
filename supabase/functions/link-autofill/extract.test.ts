import { assertEquals } from "jsr:@std/assert@1";
import { extractFromHtml, parsePrice, resolvePrices } from "./extract.ts";

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
