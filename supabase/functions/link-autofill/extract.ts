import * as cheerio from "cheerio";

export type AutofillResult = {
  title: string | null;
  image: string | null;
  price: number | null;
  salePrice: number | null;
};

export const EMPTY_RESULT: AutofillResult = {
  title: null,
  image: null,
  price: null,
  salePrice: null,
};

export function parsePrice(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// What a page says about price, before deciding which is "price" vs "sale
// price". Stores publish the *current* selling price (the sale price when
// discounted) plus, sometimes, a separate original/"was" price.
type PriceSignals = { current: number | null; original: number | null };

type PageData = {
  title: string | null;
  image: string | null;
} & PriceSignals;

export function extractOpenGraph($: cheerio.CheerioAPI): Partial<PageData> {
  const metaContent = (property: string) =>
    $(`meta[property="${property}"]`).attr("content") ??
    $(`meta[name="${property}"]`).attr("content") ??
    null;

  // Facebook catalog tags: product:price is the regular price and
  // product:sale_price the discounted one. og:price:amount (Shopify themes)
  // is the current price; product:original_price is an explicit "was".
  const regular = parsePrice(metaContent("product:price:amount"));
  const sale = parsePrice(metaContent("product:sale_price:amount"));
  const ogCurrent = parsePrice(metaContent("og:price:amount"));
  const explicitOriginal = parsePrice(
    metaContent("product:original_price:amount"),
  );

  return {
    title: metaContent("og:title"),
    image: metaContent("og:image"),
    current: sale ?? regular ?? ogCurrent,
    original: explicitOriginal ?? (sale !== null ? regular : null),
  };
}

export function findProductNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = findProductNode(entry);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Product")) return obj;
    if (obj["@graph"]) return findProductNode(obj["@graph"]);
  }
  return null;
}

const ORIGINAL_PRICE_TYPES = /StrikethroughPrice|ListPrice|MSRP/i;

// schema.org Offer: `price` (or `lowPrice` on an AggregateOffer) is what the
// item sells for now. A discounted item's original price, when published,
// sits in `priceSpecification` with priceType StrikethroughPrice/ListPrice.
function offerPrices(offer: unknown): PriceSignals {
  if (!offer || typeof offer !== "object") {
    return { current: null, original: null };
  }
  const o = offer as Record<string, unknown>;
  const current = parsePrice(String(o.price ?? o.lowPrice ?? ""));

  const specs = Array.isArray(o.priceSpecification)
    ? o.priceSpecification
    : o.priceSpecification
      ? [o.priceSpecification]
      : [];
  let original: number | null = null;
  for (const spec of specs) {
    if (!spec || typeof spec !== "object") continue;
    const sp = spec as Record<string, unknown>;
    if (ORIGINAL_PRICE_TYPES.test(String(sp.priceType ?? ""))) {
      original = parsePrice(String(sp.price ?? ""));
      if (original !== null) break;
    }
  }
  return { current, original };
}

export function extractSchemaOrg($: cheerio.CheerioAPI): Partial<PageData> {
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(script).contents().text());
    } catch {
      continue;
    }

    const product = findProductNode(parsed);
    if (!product) continue;

    const image = Array.isArray(product.image)
      ? product.image[0]
      : product.image;
    const offer = Array.isArray(product.offers)
      ? product.offers[0]
      : product.offers;

    return {
      title: typeof product.name === "string" ? product.name : null,
      image: typeof image === "string" ? image : null,
      ...offerPrices(offer),
    };
  }

  return {};
}

// Only a *higher* original price means "on sale": then it's the price and
// the current one is the sale price. Otherwise the current price stands.
export function resolvePrices({
  current,
  original,
}: PriceSignals): Pick<AutofillResult, "price" | "salePrice"> {
  if (current !== null && original !== null && original > current) {
    return { price: original, salePrice: current };
  }
  return { price: current ?? original, salePrice: null };
}

export function extractFromHtml(html: string): AutofillResult {
  const $ = cheerio.load(html);
  const schemaOrg = extractSchemaOrg($);
  const openGraph = extractOpenGraph($);

  // schema.org structured data first (more reliable for price), OG fills gaps.
  return {
    title: schemaOrg.title ?? openGraph.title ?? null,
    image: schemaOrg.image ?? openGraph.image ?? null,
    ...resolvePrices({
      current: schemaOrg.current ?? openGraph.current ?? null,
      original: schemaOrg.original ?? openGraph.original ?? null,
    }),
  };
}
