import { describe, expect, it } from "vitest";
import { runPooled } from "./pool";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("runPooled", () => {
  it("runs different keys in parallel, same key one at a time", async () => {
    const tasks = [
      { id: 1, host: "a.com" },
      { id: 2, host: "a.com" },
      { id: 3, host: "b.com" },
      { id: 4, host: "c.com" },
    ];
    let running = 0;
    let peak = 0;
    const perHost = new Map<string, number>();
    let hostOverlap = false;

    const started = Date.now();
    const results = await runPooled(tasks, {
      concurrency: 3,
      keyOf: (t) => t.host,
      gapMs: 0,
      run: async (t) => {
        running++;
        peak = Math.max(peak, running);
        const n = (perHost.get(t.host) ?? 0) + 1;
        perHost.set(t.host, n);
        if (n > 1) hostOverlap = true;
        await wait(40);
        perHost.set(t.host, n - 1);
        running--;
        return t.id;
      },
    });

    expect(results.sort()).toEqual([1, 2, 3, 4]);
    expect(peak).toBe(3);
    expect(hostOverlap).toBe(false);
    // Two rounds of 40ms, not four.
    expect(Date.now() - started).toBeLessThan(150);
  });

  it("finishes when several workers wait on the same busy key", async () => {
    const order: string[] = [];
    await runPooled(["a1", "a2", "a3", "b1"], {
      concurrency: 3,
      keyOf: (t) => t[0],
      gapMs: 0,
      run: async (t) => {
        await wait(10);
        order.push(t);
        return t;
      },
    });
    expect(order.sort()).toEqual(["a1", "a2", "a3", "b1"]);
  });

  it("waits the gap between tasks for the same key", async () => {
    const slept: number[] = [];
    await runPooled([1, 2], {
      concurrency: 2,
      keyOf: () => "same",
      gapMs: 500,
      run: async (n) => n,
      sleep: async (ms) => {
        slept.push(ms);
      },
    });
    expect(slept).toHaveLength(1);
    expect(slept[0]).toBeGreaterThan(400);
  });

  it("stops starting new tasks when asked", async () => {
    let stop = false;
    const ran: number[] = [];
    await runPooled([1, 2, 3, 4], {
      concurrency: 1,
      keyOf: (n) => String(n),
      gapMs: 0,
      run: async (n) => {
        ran.push(n);
        if (n === 2) stop = true;
        return n;
      },
      shouldStop: () => stop,
    });
    expect(ran).toEqual([1, 2]);
  });
});
