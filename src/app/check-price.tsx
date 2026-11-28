"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  summarizePriceChecks,
  type PriceCheckOutcome,
} from "@/lib/price-check";
import { useRouter } from "next/navigation";
import { checkItemPriceAction } from "./items/price-actions";
import { runPooled } from "@/lib/pool";

const GOOD_NEWS: string[] = ["now_on_sale", "price_dropped"];

export function CheckPriceButton({
  itemId,
  title,
  checkedAgo,
  lastCheckFailed = false,
}: {
  itemId: string;
  title: string;
  // "3h ago" from the last manual or automatic check, or null if never.
  checkedAgo: string | null;
  // The latest check couldn't read the store's page.
  lastCheckFailed?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    outcome: string;
    message: string;
  } | null>(null);

  return (
    <>
      <Button
        size="xs"
        variant="ghost"
        aria-label={`Check price of ${title}`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            setResult(await checkItemPriceAction(itemId));
          })
        }
      >
        <RefreshCw className={cn(pending && "animate-spin")} />
        {pending ? "Checking…" : "Check price"}
      </Button>
      {checkedAgo && !result && !pending && (
        <span className="text-muted-foreground self-center text-xs">
          {lastCheckFailed
            ? "Couldn't read this store's price. Use Save to Cubby on its page to update it."
            : `Checked ${checkedAgo}`}
        </span>
      )}
      {result && (
        <p
          role="status"
          className={cn(
            "basis-full text-xs",
            GOOD_NEWS.includes(result.outcome)
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {result.message}
        </p>
      )}
    </>
  );
}

// Re-checks wishlist items with a link, with progress and a summary: all
// of them, or just some (Select mode, KAM-94). Up to 6 stores at once
// (KAM-88, KAM-94), but never two at the same store at once, and at least
// 1.5s between pages from one store, so no store is hit harder than before.
export function useCheckAllPrices(items: { id: string; store: string }[]) {
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    // Checks running right now (KAM-99), so the parallelism is visible.
    running: number;
  } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const cancelled = useRef(false);
  const router = useRouter();

  async function run(onlyIds?: ReadonlySet<string>) {
    cancelled.current = false;
    setSummary(null);
    const chosen = onlyIds ? items.filter((i) => onlyIds.has(i.id)) : items;
    const total = chosen.length;
    let done = 0;
    let running = 0;
    const report = () => setProgress({ done, total, running });
    report();
    const outcomes = await runPooled(chosen, {
      concurrency: 6,
      keyOf: (item) => item.store,
      gapMs: 1500,
      shouldStop: () => cancelled.current,
      run: async (item): Promise<PriceCheckOutcome> => {
        running++;
        report();
        try {
          // A route handler, not a Server Action: those run one at a time
          // per browser, which would undo the parallel pool (KAM-99).
          const response = await fetch("/api/check-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: item.id }),
          });
          if (!response.ok) return "unreadable";
          const result = (await response.json()) as {
            outcome: PriceCheckOutcome | "error";
          };
          return result.outcome === "error" ? "unreadable" : result.outcome;
        } catch {
          return "unreadable";
        } finally {
          running--;
          done++;
          report();
        }
      },
    });
    // Route handlers don't refresh the page by themselves.
    router.refresh();
    setProgress(null);
    setSummary(
      (cancelled.current ? "Stopped. " : "Checked. ") +
        summarizePriceChecks(outcomes),
    );
  }

  return {
    run,
    stop: () => {
      cancelled.current = true;
    },
    progress,
    summary,
  };
}

// Shares one price-check run between the toolbar ("Check all prices", and
// the progress line) and the Select bar ("Check price", KAM-94).
type PriceCheckRun = ReturnType<typeof useCheckAllPrices> & {
  items: { id: string; store: string }[];
};
const PriceCheckContext = createContext<PriceCheckRun | null>(null);

export function PriceCheckProvider({
  items,
  children,
}: {
  items: { id: string; store: string }[];
  children: ReactNode;
}) {
  const check = useCheckAllPrices(items);
  return (
    <PriceCheckContext.Provider value={{ ...check, items }}>
      {children}
    </PriceCheckContext.Provider>
  );
}

export function usePriceCheck() {
  return useContext(PriceCheckContext);
}
