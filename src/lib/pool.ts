// Runs tasks a few at a time, but never two with the same key at once, and
// with a pause between tasks that share a key (KAM-88: Check all prices runs
// several stores in parallel without hitting any one store harder).
export async function runPooled<T, R>(
  tasks: T[],
  {
    concurrency,
    keyOf,
    gapMs,
    run,
    shouldStop = () => false,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  }: {
    concurrency: number;
    keyOf: (task: T) => string;
    gapMs: number;
    run: (task: T) => Promise<R>;
    shouldStop?: () => boolean;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<R[]> {
  const queue = tasks.map((task, index) => ({ task, index }));
  const busy = new Set<string>();
  const lastDone = new Map<string, number>();
  const results: R[] = [];
  // Workers waiting for a store to free up. Every waiter is woken when any
  // task finishes, so none can be left waiting forever.
  let waiters: (() => void)[] = [];
  const notify = () => {
    const woken = waiters;
    waiters = [];
    woken.forEach((wake) => wake());
  };

  async function worker() {
    while (queue.length > 0 && !shouldStop()) {
      // The first queued task whose store isn't already being checked.
      const at = queue.findIndex(({ task }) => !busy.has(keyOf(task)));
      if (at === -1) {
        await new Promise<void>((resolve) => waiters.push(resolve));
        continue;
      }
      const [{ task, index }] = queue.splice(at, 1);
      const key = keyOf(task);
      busy.add(key);
      const since = Date.now() - (lastDone.get(key) ?? -Infinity);
      if (since < gapMs) await sleep(gapMs - since);
      try {
        results[index] = await run(task);
      } finally {
        lastDone.set(key, Date.now());
        busy.delete(key);
        notify();
      }
    }
    notify();
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
  return results.filter((r) => r !== undefined);
}
