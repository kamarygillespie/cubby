// First-party recommendations (KAM-52): only your own items, prices, stars
// and purchases — no outside catalog, no ML. FEATURES.md resolved the V3
// open question this way.
import { displayDiscountPercent, effectivePrice } from "@/lib/items-view";
import { storeKey } from "@/lib/stores";

export type RecItem = {
  id: string;
  title: string;
  price: number | null;
  sale_price: number | null;
  interest_level: number | null;
  store_brand: string | null;
  category: string;
  itemType: string;
};

export type BuyNextPick = { item: RecItem; score: number; reasons: string[] };

// Highest price recently seen per item (from price history), to detect drops.
export type RecentHighs = ReadonlyMap<string, number>;

const pct = (n: number) => `${Math.round(n)}%`;

// Weights: interest 40, discount 30, recent drop 15, category affinity 10,
// store you've bought from 5. Reasons list the parts that contributed.
export function buyNext(
  wishlist: RecItem[],
  purchased: RecItem[],
  recentHighs: RecentHighs = new Map(),
  limit = 5,
): BuyNextPick[] {
  const categoryCounts = new Map<string, number>();
  const storeCounts = new Map<string, number>();
  for (const p of purchased) {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
    const key = storeKey(p.store_brand);
    if (key) storeCounts.set(key, (storeCounts.get(key) ?? 0) + 1);
  }
  const maxCategory = Math.max(0, ...categoryCounts.values());

  return wishlist
    .map((item) => {
      const reasons: string[] = [];
      let score = 0;

      const stars = item.interest_level ?? 0;
      score += (stars / 5) * 40;
      if (stars >= 4) reasons.push(`${stars}★`);

      const discount = displayDiscountPercent(item.price, item.sale_price);
      if (discount !== null) {
        score += (Math.min(discount, 50) / 50) * 30;
        reasons.push(`${discount}% off`);
      }

      const high = recentHighs.get(item.id);
      const now = effectivePrice(item);
      if (high !== undefined && now > 0 && now < high) {
        const drop = ((high - now) / high) * 100;
        if (drop >= 5) {
          score += (Math.min(drop, 40) / 40) * 15;
          reasons.push(`price dropped ${pct(drop)} recently`);
        }
      }

      const catCount = categoryCounts.get(item.category) ?? 0;
      if (catCount > 0 && maxCategory > 0) {
        score += (catCount / maxCategory) * 10;
        if (catCount === maxCategory)
          reasons.push(`you buy a lot of ${item.category}`);
      }

      const key = storeKey(item.store_brand);
      const bought = key ? (storeCounts.get(key) ?? 0) : 0;
      if (bought > 0) {
        score += 5;
        reasons.push(`you've bought from ${item.store_brand!.trim()} before`);
      }

      return { item, score: Math.round(score * 10) / 10, reasons };
    })
    .filter((pick) => pick.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title),
    )
    .slice(0, limit);
}

// Other items with the same item type, or from the same store.
export function moreLikeThis<T extends RecItem>(
  item: RecItem,
  candidates: T[],
  limit = 6,
): T[] {
  const key = storeKey(item.store_brand);
  const sameType = (c: RecItem) => c.itemType === item.itemType;
  const sameStore = (c: RecItem) =>
    key !== null && storeKey(c.store_brand) === key;
  return candidates
    .filter((c) => c.id !== item.id && (sameType(c) || sameStore(c)))
    .sort(
      (a, b) =>
        Number(sameType(b) && sameStore(b)) -
          Number(sameType(a) && sameStore(a)) || a.title.localeCompare(b.title),
    )
    .slice(0, limit);
}

export type TasteProfile = {
  topCategories: { name: string; share: number }[];
  topStores: { name: string; count: number }[];
  priceRange: { low: number; high: number } | null; // middle half of prices paid
  purchaseCount: number;
};

const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

export function tasteProfile(purchased: RecItem[]): TasteProfile {
  const n = purchased.length;
  const cats = new Map<string, number>();
  const stores = new Map<string, { name: string; count: number }>();
  for (const p of purchased) {
    cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
    const key = storeKey(p.store_brand);
    if (key) {
      const s = stores.get(key) ?? { name: p.store_brand!.trim(), count: 0 };
      s.count++;
      stores.set(key, s);
    }
  }
  const prices = purchased
    .map((p) => effectivePrice(p))
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  return {
    topCategories: [...cats]
      .map(([name, count]) => ({ name, share: Math.round((count / n) * 100) }))
      .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))
      .slice(0, 3),
    topStores: [...stores.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 3),
    priceRange:
      prices.length >= 2
        ? {
            low: Math.round(quantile(prices, 0.25)),
            high: Math.round(quantile(prices, 0.75)),
          }
        : null,
    purchaseCount: n,
  };
}

// Adapts a DB item row (ITEM_SELECT shape) for the functions above.
export function toRecItem(item: {
  id: string;
  title: string;
  price: number | null;
  sale_price: number | null;
  interest_level: number | null;
  store_brand: string | null;
  item_type: { name: string; category: { name: string } };
}): RecItem {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    sale_price: item.sale_price,
    interest_level: item.interest_level,
    store_brand: item.store_brand,
    category: item.item_type.category.name,
    itemType: item.item_type.name,
  };
}
