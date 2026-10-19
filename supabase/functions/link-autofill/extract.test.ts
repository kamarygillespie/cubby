import { assertEquals } from "jsr:@std/assert@1";
import { extractFromHtml, parsePrice } from "./extract.ts";

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
