import * as cheerio from "cheerio";

export type AutofillResult = {
  title: string | null;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  // The brand or store selling it, and the store's own product category.
  store: string | null;
  category: string | null;
  // The store refused the request, as opposed to a page we couldn't parse.
  blocked: boolean;
};

export const EMPTY_RESULT: AutofillResult = {
  title: null,
  image: null,
  price: null,
  salePrice: null,
  store: null,
  category: null,
  blocked: false,
};

export function parsePrice(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// What a page says about price, before deciding which is "price" vs "sale
// price". Stores publish the *current* selling price (the sale price when
// discounted) plus, sometimes, a separate original/"was" price.
type PriceSignals = {
  current: number | null;
  original: number | null;
  currency?: string | null;
};

type PageData = {
  title: string | null;
  image: string | null;
  store: string | null;
  category: string | null;
} & PriceSignals;

// "PUMA | Official Site" → "PUMA".
function cleanStoreName(name: string | null | undefined): string | null {
  const cleaned = name?.split(/\s+[|–—-]\s+/)[0]?.trim();
  return cleaned ? cleaned : null;
}

// schema.org brand is either a name or an object with one.
function brandName(brand: unknown): string | null {
  const first = Array.isArray(brand) ? brand[0] : brand;
  if (typeof first === "string") return cleanStoreName(first);
  if (first && typeof first === "object") {
    const name = (first as Record<string, unknown>).name;
    return typeof name === "string" ? cleanStoreName(name) : null;
  }
  return null;
}

// Stores whose name can't be worked out from their web address.
const STORE_NAMES: Record<string, string> = {
  abercrombie: "Abercrombie & Fitch",
  adidas: "adidas",
  aloyoga: "Alo Yoga",
  asos: "ASOS",
  bestbuy: "Best Buy",
  bloomingdales: "Bloomingdale's",
  drmartens: "Dr. Martens",
  freepeople: "Free People",
  hm: "H&M",
  jcrew: "J.Crew",
  katespade: "Kate Spade",
  lululemon: "lululemon",
  macys: "Macy's",
  newbalance: "New Balance",
  puma: "PUMA",
  rarebeauty: "Rare Beauty",
  stevemadden: "Steve Madden",
  summerfridays: "Summer Fridays",
  thereformation: "Reformation",
  uniqlo: "UNIQLO",
  urbanoutfitters: "Urban Outfitters",
  vuoriclothing: "Vuori",
};

// A readable store name from a web address, for pages that don't state one:
// us.puma.com → Puma, shop.example.co.uk → Example.
export function storeFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host.endsWith("oldnavy.gap.com")) return "Old Navy";
  if (host.endsWith("bananarepublic.gap.com")) return "Banana Republic";
  const labels = host.split(".");
  if (labels.length < 2) return null;
  const hasCountrySuffix =
    labels.length > 2 &&
    labels.at(-1)!.length === 2 &&
    labels.at(-2)!.length <= 3;
  const name = labels.at(hasCountrySuffix ? -3 : -2);
  if (!name) return null;
  return STORE_NAMES[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

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
    store: cleanStoreName(
      metaContent("product:brand") ??
        metaContent("og:brand") ??
        metaContent("og:site_name"),
    ),
    category: metaContent("product:category"),
    currency:
      metaContent("product:price:currency")?.toUpperCase() ??
      metaContent("og:price:currency")?.toUpperCase() ??
      null,
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
  const currency =
    typeof o.priceCurrency === "string" ? o.priceCurrency.toUpperCase() : null;
  return { current, original, currency };
}

// Every Product or ProductGroup in a page's structured data.
function collectProductNodes(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(collectProductNodes);
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const types = [obj["@type"]].flat();
  const own =
    types.includes("Product") || types.includes("ProductGroup") ? [obj] : [];
  return [...own, ...collectProductNodes(obj["@graph"])];
}

const firstOf = (value: unknown) => (Array.isArray(value) ? value[0] : value);

// The price can sit on the product, inside an aggregate offer, or on its
// first variant (a ProductGroup, common on Shopify stores).
function offerFor(product: Record<string, unknown>): unknown {
  const unwrap = (offer: unknown) => {
    const nested = (offer as Record<string, unknown> | null)?.offers;
    return firstOf(nested) ?? offer;
  };
  const direct = unwrap(firstOf(product.offers));
  if (direct) return direct;
  const variant = firstOf(product.hasVariant) as
    Record<string, unknown> | undefined;
  return variant ? unwrap(firstOf(variant.offers)) : null;
}

function imageFor(product: Record<string, unknown>): string | null {
  const variant = firstOf(product.hasVariant) as
    Record<string, unknown> | undefined;
  const image = firstOf(product.image) ?? firstOf(variant?.image);
  if (typeof image === "string") return image;
  const url = (image as Record<string, unknown> | null)?.url;
  return typeof url === "string" ? url : null;
}

export function extractSchemaOrg($: cheerio.CheerioAPI): Partial<PageData> {
  const products = $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((script) => {
      try {
        return collectProductNodes(JSON.parse($(script).contents().text()));
      } catch {
        return [];
      }
    });

  const named = products.filter((p) => typeof p.name === "string");
  const product = named.find((p) => offerFor(p)) ?? named[0] ?? products[0];
  if (!product) return {};

  return {
    title: typeof product.name === "string" ? product.name : null,
    image: imageFor(product),
    store: brandName(product.brand),
    category: typeof product.category === "string" ? product.category : null,
    ...offerPrices(offerFor(product)),
  };
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

// Some international stores keep prices in their home currency and publish
// the US price separately in the page's data. Missguided, for example, labels
// £31.74 as "USD" while also stating "sale_price_usd": 41.93.
const USD_SALE_PRICE = /sale_price_usd[\\"\s:]+([\d.]+)/;
const HOME_CURRENCY = /currency_code[\\"\s:]+([A-Z]{3})/;
const HOME_SALE_PRICE =
  /discount_price_list[\s\S]{0,40}?sale_price[\\"\s:]+([\d.]+)/;

function usdPriceSignals(
  html: string,
  schemaOrg: Partial<PageData>,
  openGraph: Partial<PageData>,
): PriceSignals {
  const current = schemaOrg.current ?? openGraph.current ?? null;
  const original = schemaOrg.original ?? openGraph.original ?? null;

  const usd = parsePrice(html.match(USD_SALE_PRICE)?.[1]);
  const home = html.match(HOME_CURRENCY)?.[1];
  const homeSale = parsePrice(html.match(HOME_SALE_PRICE)?.[1]) ?? current;
  if (usd !== null && home && home !== "USD" && homeSale !== null) {
    const homeList = openGraph.current ?? null;
    return {
      current: usd,
      original:
        homeList !== null && homeList > homeSale
          ? Math.round((homeList * usd * 100) / homeSale) / 100
          : null,
    };
  }

  // Cubby shows dollars, so never pass off another currency as dollars.
  const foreign = [schemaOrg.currency, openGraph.currency].some(
    (currency) => currency && currency !== "USD",
  );
  return foreign ? { current: null, original: null } : { current, original };
}

export function extractFromHtml(html: string): AutofillResult {
  const $ = cheerio.load(html);
  const schemaOrg = extractSchemaOrg($);
  const openGraph = extractOpenGraph($);

  // schema.org structured data first (more reliable for price), OG fills gaps.
  return {
    title: schemaOrg.title ?? openGraph.title ?? null,
    image: schemaOrg.image ?? openGraph.image ?? null,
    store: schemaOrg.store ?? openGraph.store ?? null,
    category: schemaOrg.category ?? openGraph.category ?? null,
    blocked: false,
    ...resolvePrices(usdPriceSignals(html, schemaOrg, openGraph)),
  };
}
