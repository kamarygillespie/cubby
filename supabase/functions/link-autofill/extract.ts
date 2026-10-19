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

export function extractOpenGraph(
  $: cheerio.CheerioAPI,
): Partial<AutofillResult> {
  const metaContent = (property: string) =>
    $(`meta[property="${property}"]`).attr("content") ??
    $(`meta[name="${property}"]`).attr("content") ??
    null;

  return {
    title: metaContent("og:title"),
    image: metaContent("og:image"),
    price: parsePrice(metaContent("product:price:amount")),
    salePrice: parsePrice(metaContent("product:sale_price:amount")),
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

export function extractSchemaOrg(
  $: cheerio.CheerioAPI,
): Partial<AutofillResult> {
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
    const offers = Array.isArray(product.offers)
      ? product.offers[0]
      : product.offers;
    const price =
      offers && typeof offers === "object"
        ? parsePrice(String((offers as Record<string, unknown>).price ?? ""))
        : null;

    return {
      title: typeof product.name === "string" ? product.name : null,
      image: typeof image === "string" ? image : null,
      price,
      salePrice: null,
    };
  }

  return {};
}

export function extractFromHtml(html: string): AutofillResult {
  const $ = cheerio.load(html);
  const schemaOrg = extractSchemaOrg($);
  const openGraph = extractOpenGraph($);

  // schema.org structured data first (more reliable for price), OG fills gaps.
  return {
    title: schemaOrg.title ?? openGraph.title ?? null,
    image: schemaOrg.image ?? openGraph.image ?? null,
    price: schemaOrg.price ?? openGraph.price ?? null,
    salePrice: schemaOrg.salePrice ?? openGraph.salePrice ?? null,
  };
}
