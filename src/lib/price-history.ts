// Price history for one item (KAM-95), from its readable price checks.
// Pure, so it's unit-tested.

export type PricePoint = { at: string; price: number };

// Readable checks → the price you'd pay at each, oldest first, keeping only
// the points where the price changed (plus the latest), so a flat month is
// two points, not thirty.
export function pricePoints(
  checks: {
    checked_at: string;
    price: number | null;
    sale_price: number | null;
  }[],
): PricePoint[] {
  const paid = checks
    .filter((c) => c.price !== null)
    .map((c) => ({
      at: c.checked_at,
      price:
        c.sale_price !== null && c.sale_price < c.price!
          ? c.sale_price
          : c.price!,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
  return paid.filter(
    (p, i) => i === 0 || i === paid.length - 1 || p.price !== paid[i - 1].price,
  );
}

export type PriceSummary = {
  now: number;
  low: number;
  lowAt: string;
  high: number;
  // Today's price is the lowest seen in the window.
  atLowest: boolean;
};

export function summarizePrices(points: PricePoint[]): PriceSummary | null {
  if (points.length < 2) return null;
  let low = points[0];
  let high = points[0].price;
  for (const p of points) {
    if (p.price < low.price) low = p;
    high = Math.max(high, p.price);
  }
  const now = points[points.length - 1].price;
  return {
    now,
    low: low.price,
    lowAt: low.at,
    high,
    atLowest: now <= low.price,
  };
}
