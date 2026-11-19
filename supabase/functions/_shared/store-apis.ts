import { EMPTY_RESULT, resolvePrices, type AutofillResult } from "./extract.ts";

// Stores that block page reading but publish official developer APIs
// (KAM-66). Each one only runs when its key is configured as a secret:
//   BESTBUY_API_KEY  from developer.bestbuy.com
//   ETSY_API_KEY     "keystring:shared_secret" from etsy.com/developers

type Deps = {
  fetch: typeof fetch;
  env: (name: string) => string | undefined;
};

const defaultDeps: Deps = {
  fetch: (...args) => fetch(...args),
  env: (name) => Deno.env.get(name),
};

const isHost = (url: URL, domain: string) =>
  url.hostname === domain || url.hostname.endsWith(`.${domain}`);

// /site/name/6525401.p?skuId=6525401 or /product/name/ABC123/sku/6525401
export function bestBuySku(url: URL): string | null {
  if (!isHost(url, "bestbuy.com")) return null;
  const fromQuery = url.searchParams.get("skuId");
  if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;
  return (
    url.pathname
      .match(/\/sku\/(\d+)|\/(\d+)\.p$/)
      ?.slice(1)
      .find(Boolean) ?? null
  );
}

// /listing/470111880/some-title
export function etsyListingId(url: URL): string | null {
  if (!isHost(url, "etsy.com")) return null;
  return url.pathname.match(/\/listing\/(\d+)/)?.[1] ?? null;
}

const positive = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;

async function fromBestBuy(sku: string, key: string, deps: Deps) {
  const fields = "name,image,regularPrice,salePrice,manufacturer";
  const response = await deps.fetch(
    `https://api.bestbuy.com/v1/products/${sku}.json?format=json&show=${fields}&apiKey=${encodeURIComponent(key)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) return null;
  const product = await response.json();
  return {
    ...EMPTY_RESULT,
    title: typeof product.name === "string" ? product.name : null,
    image: typeof product.image === "string" ? product.image : null,
    store: "Best Buy",
    ...resolvePrices({
      current: positive(product.salePrice),
      original: positive(product.regularPrice),
    }),
  } satisfies AutofillResult;
}

async function fromEtsy(listingId: string, key: string, deps: Deps) {
  const response = await deps.fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}?includes=Images,Shop`,
    {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) return null;
  const listing = await response.json();
  const amount = positive(listing.price?.amount);
  const divisor = positive(listing.price?.divisor);
  return {
    ...EMPTY_RESULT,
    title: typeof listing.title === "string" ? listing.title : null,
    image: listing.images?.[0]?.url_fullxfull ?? null,
    store: listing.shop?.shop_name ?? "Etsy",
    price: amount !== null && divisor !== null ? amount / divisor : null,
  } satisfies AutofillResult;
}

// Null means "use the normal page reader": not one of these stores, no key
// configured, or the API didn't return a usable product.
export async function fetchFromStoreApi(
  url: URL,
  deps: Deps = defaultDeps,
): Promise<AutofillResult | null> {
  try {
    const sku = bestBuySku(url);
    const bestBuyKey = deps.env("BESTBUY_API_KEY");
    if (sku && bestBuyKey) return await fromBestBuy(sku, bestBuyKey, deps);

    const listingId = etsyListingId(url);
    const etsyKey = deps.env("ETSY_API_KEY");
    if (listingId && etsyKey) return await fromEtsy(listingId, etsyKey, deps);
  } catch {
    // Network trouble: fall through to the normal reader.
  }
  return null;
}
