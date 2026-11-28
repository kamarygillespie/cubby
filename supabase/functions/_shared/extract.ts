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
  // Stock (KAM-75): any size buyable, or null when the page doesn't say.
  inStock: boolean | null;
  // Per size, when the page lists sizes ("m", "8.5").
  sizes: { size: string; inStock: boolean }[];
};

export const EMPTY_RESULT: AutofillResult = {
  title: null,
  image: null,
  price: null,
  salePrice: null,
  store: null,
  category: null,
  blocked: false,
  inStock: null,
  sizes: [],
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
  inStock: boolean | null;
  sizes: { size: string; inStock: boolean }[];
} & PriceSignals;

// schema.org availability ("https://schema.org/InStock") or Open Graph's
// ("in stock", "instock") → buyable or not. Pre-orders and back-orders can
// be bought, so they count as in stock. Null when it's missing or unknown.
export function parseAvailability(value: unknown): boolean | null {
  if (typeof value !== "string") return null;
  const v = value.toLowerCase().replace(/[^a-z]/g, "");
  if (/(outofstock|soldout|discontinued)$/.test(v)) return false;
  if (
    /(instock|limitedavailability|onlineonly|instoreonly|preorder|presale|backorder)$/.test(
      v,
    )
  ) {
    return true;
  }
  return null;
}

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
    inStock: parseAvailability(
      metaContent("product:availability") ?? metaContent("og:availability"),
    ),
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
    ...stockFor(product),
    ...offerPrices(offerFor(product)),
  };
}

// Stock from a Product's offer, or from each variant of a ProductGroup
// (Gymshark lists every size with its own availability).
function stockFor(product: Record<string, unknown>): {
  inStock: boolean | null;
  sizes: { size: string; inStock: boolean }[];
} {
  const availabilityOf = (node: Record<string, unknown>) => {
    const offers = [node.offers].flat();
    for (const offer of offers) {
      const o = offer as Record<string, unknown> | null;
      const direct = parseAvailability(o?.availability);
      if (direct !== null) return direct;
      const nested = [o?.offers].flat()[0] as
        Record<string, unknown> | undefined;
      const inner = parseAvailability(nested?.availability);
      if (inner !== null) return inner;
    }
    return null;
  };

  const variants = [product.hasVariant]
    .flat()
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object");
  const sizes = variants.flatMap((v) => {
    const inStock = availabilityOf(v);
    const size = typeof v.size === "string" ? v.size.trim() : "";
    return size && inStock !== null ? [{ size, inStock }] : [];
  });
  const variantStock = variants
    .map(availabilityOf)
    .filter((v): v is boolean => v !== null);
  const own = availabilityOf(product);
  return {
    inStock: own ?? (variantStock.length ? variantStock.some(Boolean) : null),
    sizes,
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

// Store data (Shopify and similar) often names the original price outside
// the standard product tags, e.g. Gymshark's "price":30,"compareAtPrice":50
// (KAM-74). Keys may be JSON-escaped inside a script string (\"price\").
const ORIGINAL_PRICE_KEY =
  /\\?["'](?:compareAtPrice|compare_at_price|originalPrice|original_price|wasPrice|was_price|listPrice|list_price|regularPrice|regular_price|strikethroughPrice|strikethrough_price)\\?["']\s*:\s*\\?["']?(\d+(?:\.\d+)?)/g;
const CURRENT_PRICE_KEY =
  /\\?["'](?:price|salePrice|sale_price|currentPrice|current_price|finalPrice|final_price)\\?["']\s*:\s*\\?["']?(\d+(?:\.\d+)?)/g;
const NEARBY = 120; // chars either side: the same JSON object
const CONTEXT = 1500; // chars either side: close enough to name the product

const sameMoney = (a: number, b: number) => Math.abs(a - b) < 0.005;

// Where a page names this product: its handle (last path segment of its
// canonical/product URL) and any product, group or SKU IDs.
export function productIdentifiers($: cheerio.CheerioAPI): string[] {
  const ids = new Set<string>();
  const addHandle = (url: unknown) => {
    if (typeof url !== "string") return;
    try {
      const handle = new URL(url, "https://x.invalid").pathname
        .split("/")
        .filter(Boolean)
        .at(-1);
      if (handle && handle.length >= 6) ids.add(handle);
    } catch {
      // not a URL
    }
  };
  addHandle($('link[rel="canonical"]').attr("href"));
  addHandle($('meta[property="og:url"]').attr("content"));
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      for (const product of collectProductNodes(
        JSON.parse($(script).contents().text()),
      )) {
        addHandle(product.url);
        for (const key of ["productGroupID", "productID", "sku", "mpn"]) {
          const value = product[key];
          if (typeof value === "string" && value.length >= 4) ids.add(value);
        }
      }
    } catch {
      // malformed JSON-LD
    }
  });
  return [...ids];
}

// The original price for *this* product, from store data in the page. Only
// trusts a value sitting next to a price equal to the product's current one
// (also in cents, as Shopify's product JSON uses). Pages also carry data for
// recommended products, so: when the page names its product, only matches
// near that handle/ID count, and if what's left disagrees, return null
// rather than guess.
export function findOriginalPrice(
  html: string,
  current: number,
  identifiers: string[],
): number | null {
  const near: number[] = [];
  const all: number[] = [];
  for (const match of html.matchAll(ORIGINAL_PRICE_KEY)) {
    const value = Number(match[1]);
    const at = match.index ?? 0;
    const start = Math.max(0, at - NEARBY);
    const window = html.slice(start, at + NEARBY);
    // The price closest to the key is the one in the same object.
    let seen: number | null = null;
    let distance = Infinity;
    for (const price of window.matchAll(CURRENT_PRICE_KEY)) {
      const d = Math.abs(start + (price.index ?? 0) - at);
      if (d < distance) [seen, distance] = [Number(price[1]), d];
    }
    let original: number | null = null;
    if (seen !== null && sameMoney(seen, current)) original = value;
    else if (seen !== null && sameMoney(seen, current * 100)) {
      original = value / 100;
    }
    if (original === null || original <= current) continue;
    all.push(original);
    const context = html.slice(Math.max(0, at - CONTEXT), at + CONTEXT);
    if (identifiers.some((id) => context.includes(id))) near.push(original);
  }
  // A page that names its product but has no match near that name: the
  // matches belong to other products.
  const pool = identifiers.length ? near : all;
  if (!pool.length) return null;
  return pool.every((v) => sameMoney(v, pool[0])) ? pool[0] : null;
}

export function extractFromHtml(html: string): AutofillResult {
  const $ = cheerio.load(html);
  const schemaOrg = extractSchemaOrg($);
  const openGraph = extractOpenGraph($);

  const signals = usdPriceSignals(html, schemaOrg, openGraph);
  if (signals.current !== null && signals.original === null) {
    signals.original = findOriginalPrice(
      html,
      signals.current,
      productIdentifiers($),
    );
  }

  // schema.org structured data first (more reliable for price), OG fills gaps.
  return {
    title: schemaOrg.title ?? openGraph.title ?? null,
    image: schemaOrg.image ?? openGraph.image ?? null,
    store: schemaOrg.store ?? openGraph.store ?? null,
    category: schemaOrg.category ?? openGraph.category ?? null,
    blocked: false,
    inStock: schemaOrg.inStock ?? openGraph.inStock ?? null,
    sizes: schemaOrg.sizes ?? [],
    ...resolvePrices(signals),
  };
}
