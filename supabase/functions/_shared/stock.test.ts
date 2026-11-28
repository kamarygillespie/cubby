import { assertEquals } from "jsr:@std/assert@1";
import { normalizeSize, stockForNotes, wantedSize } from "./stock.ts";
import { extractFromHtml, parseAvailability } from "./extract.ts";

Deno.test("reads schema.org and Open Graph availability", () => {
  assertEquals(parseAvailability("https://schema.org/InStock"), true);
  assertEquals(parseAvailability("http://schema.org/OutOfStock"), false);
  assertEquals(parseAvailability("SoldOut"), false);
  assertEquals(parseAvailability("https://schema.org/PreOrder"), true);
  assertEquals(parseAvailability("in stock"), true);
  assertEquals(parseAvailability("out of stock"), false);
  assertEquals(parseAvailability("maybe"), null);
  assertEquals(parseAvailability(undefined), null);
});

Deno.test("finds the wanted size in notes", () => {
  assertEquals(wantedSize("wait for sale, size M"), "m");
  assertEquals(wantedSize("Size: medium"), "m");
  assertEquals(wantedSize("sz 8.5 wide"), "8.5");
  assertEquals(wantedSize("size 30x32"), "30x32");
  assertEquals(wantedSize("size extra small"), "xs");
  assertEquals(wantedSize("love the color"), null);
  assertEquals(wantedSize(null), null);
  assertEquals(normalizeSize("X-Large"), "xl");
});

// Gymshark-style ProductGroup: overall in stock, but M sold out.
const groupPage = `<script type="application/ld+json">${JSON.stringify({
  "@type": "ProductGroup",
  name: "Campus Track Pants",
  hasVariant: ["xs", "s", "m", "l", "xl"].map((size) => ({
    "@type": "Product",
    size,
    offers: {
      price: 30,
      priceCurrency: "USD",
      availability: `https://schema.org/${size === "xl" ? "InStock" : "OutOfStock"}`,
    },
  })),
})}</script>`;

Deno.test(
  "a ProductGroup is in stock if any size is, with each size's stock",
  () => {
    const page = extractFromHtml(groupPage);
    assertEquals(page.inStock, true);
    assertEquals(page.sizes.length, 5);
    assertEquals(
      page.sizes.find((s) => s.size === "m"),
      { size: "m", inStock: false },
    );
  },
);

Deno.test("stock for the size in the notes, else overall", () => {
  const page = extractFromHtml(groupPage);
  assertEquals(stockForNotes(page, "size M"), { inStock: false, size: "m" });
  assertEquals(stockForNotes(page, "size XL"), { inStock: true, size: "xl" });
  // Size not listed, or no size in notes: the overall answer.
  assertEquals(stockForNotes(page, "size 8"), { inStock: true, size: null });
  assertEquals(stockForNotes(page, null), { inStock: true, size: null });
});

Deno.test("a single Product's own availability, and OG as a fallback", () => {
  const product = extractFromHtml(
    `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "Blush",
      offers: {
        price: 25,
        priceCurrency: "USD",
        availability: "https://schema.org/OutOfStock",
      },
    })}</script>`,
  );
  assertEquals(product.inStock, false);
  assertEquals(product.sizes, []);
  const og = extractFromHtml(
    `<meta property="og:title" content="Mug"><meta property="product:availability" content="instock">`,
  );
  assertEquals(og.inStock, true);
  assertEquals(extractFromHtml(`<title>x</title>`).inStock, null);
});

Deno.test(
  "falls back to the saved size when the notes don't say (KAM-97)",
  () => {
    const page = extractFromHtml(groupPage);
    assertEquals(stockForNotes(page, "love it", "M"), {
      inStock: false,
      size: "m",
    });
    assertEquals(stockForNotes(page, null, "Medium"), {
      inStock: false,
      size: "m",
    });
    // The notes win.
    assertEquals(stockForNotes(page, "size XL", "M"), {
      inStock: true,
      size: "xl",
    });
    assertEquals(stockForNotes(page, null, null), {
      inStock: true,
      size: null,
    });
  },
);
