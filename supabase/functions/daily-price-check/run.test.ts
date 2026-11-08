import { assertEquals } from "jsr:@std/assert@1";
import { type Prices, runPriceChecks } from "./run.ts";

function harness(
  items: { id: string; link: string }[],
  pages: Record<string, Prices>,
) {
  let clock = 0;
  const recorded: [string, Prices][] = [];
  const fetched: string[] = [];
  const deps = {
    listDue: (limit: number) => Promise.resolve(items.slice(0, limit)),
    fetchPrices: (url: URL) => {
      fetched.push(url.href);
      clock += 1000; // each page "takes" 1s
      return Promise.resolve(
        pages[url.href] ?? { price: null, salePrice: null },
      );
    },
    record: (id: string, prices: Prices) => {
      if (id === "deleted") return Promise.reject(new Error("Item not found"));
      recorded.push([id, prices]);
      return Promise.resolve();
    },
    sleep: (ms: number) => {
      clock += ms;
      return Promise.resolve();
    },
    now: () => clock,
  };
  return { deps, recorded, fetched };
}

const opts = { batchSize: 25, budgetMs: 100_000, delayMs: 1000 };

Deno.test("checks each due item and records what the page said", async () => {
  const { deps, recorded } = harness(
    [
      { id: "a", link: "https://shop.example/a" },
      { id: "b", link: "https://shop.example/b" },
    ],
    { "https://shop.example/a": { price: 73, salePrice: 49.99 } },
  );
  const summary = await runPriceChecks(deps, opts);
  assertEquals(summary, { checked: 2, readable: 1, unreadable: 1, failed: 0 });
  assertEquals(recorded, [
    ["a", { price: 73, salePrice: 49.99 }],
    ["b", { price: null, salePrice: null }],
  ]);
});

Deno.test(
  "stops starting new checks once the time budget is spent",
  async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      link: `https://shop.example/${i}`,
    }));
    const { deps, fetched } = harness(items, {});
    // 1s fetch + 1s delay per item; a 5s budget allows 3 items.
    await runPriceChecks(deps, { ...opts, budgetMs: 5000 });
    assertEquals(fetched.length, 3);
  },
);

Deno.test("respects the batch size", async () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    link: `https://shop.example/${i}`,
  }));
  const { deps, fetched } = harness(items, {});
  await runPriceChecks(deps, { ...opts, batchSize: 4 });
  assertEquals(fetched.length, 4);
});

Deno.test(
  "a malformed link is recorded as unreadable; a failing item is skipped",
  async () => {
    const { deps, recorded } = harness(
      [
        { id: "bad", link: "not a url" },
        { id: "deleted", link: "https://shop.example/gone" },
        { id: "ok", link: "https://shop.example/ok" },
      ],
      { "https://shop.example/ok": { price: 20, salePrice: null } },
    );
    const summary = await runPriceChecks(deps, opts);
    assertEquals(summary, {
      checked: 2,
      readable: 1,
      unreadable: 1,
      failed: 1,
    });
    assertEquals(
      recorded.map(([id]) => id),
      ["bad", "ok"],
    );
  },
);
