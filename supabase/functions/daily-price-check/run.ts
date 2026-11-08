// The scheduled price-check loop, with its I/O injected so it can be tested
// without a network or database (run.test.ts).

export type DueItem = { id: string; link: string };
export type Prices = { price: number | null; salePrice: number | null };

export type RunDeps = {
  listDue: (limit: number) => Promise<DueItem[]>;
  fetchPrices: (url: URL) => Promise<Prices>;
  record: (itemId: string, prices: Prices) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

export type RunOptions = {
  batchSize: number; // items per run
  budgetMs: number; // stop starting new checks after this long
  delayMs: number; // pause between pages, to be gentle on stores
};

export type RunSummary = {
  checked: number;
  readable: number;
  unreadable: number;
  failed: number;
};

export async function runPriceChecks(
  deps: RunDeps,
  { batchSize, budgetMs, delayMs }: RunOptions,
): Promise<RunSummary> {
  const started = deps.now();
  const summary: RunSummary = {
    checked: 0,
    readable: 0,
    unreadable: 0,
    failed: 0,
  };
  const items = await deps.listDue(batchSize);

  for (const [i, item] of items.entries()) {
    if (deps.now() - started > budgetMs) break;
    let url: URL;
    try {
      url = new URL(item.link);
    } catch {
      // A malformed saved link still counts as checked, so it isn't retried
      // every hour.
      await deps.record(item.id, { price: null, salePrice: null });
      summary.checked++;
      summary.unreadable++;
      continue;
    }
    try {
      const prices = await deps.fetchPrices(url);
      await deps.record(item.id, prices);
      summary.checked++;
      if (prices.price === null) summary.unreadable++;
      else summary.readable++;
    } catch {
      // e.g. the item was deleted mid-run; skip it, keep going.
      summary.failed++;
    }
    if (i < items.length - 1) await deps.sleep(delayMs);
  }
  return summary;
}
