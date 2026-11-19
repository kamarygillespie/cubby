"use client";

import { useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  summarizePriceChecks,
  type PriceCheckOutcome,
} from "@/lib/price-check";
import { checkItemPriceAction } from "./items/price-actions";

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

// Re-checks every wishlist item with a link, one at a time so stores aren't
// hammered, with progress and a summary.
export function useCheckAllPrices(itemIds: string[]) {
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const cancelled = useRef(false);

  async function run() {
    cancelled.current = false;
    setSummary(null);
    const outcomes: PriceCheckOutcome[] = [];
    for (let i = 0; i < itemIds.length; i++) {
      if (cancelled.current) break;
      setProgress({ done: i, total: itemIds.length });
      const result = await checkItemPriceAction(itemIds[i]);
      outcomes.push(result.outcome === "error" ? "unreadable" : result.outcome);
      if (i < itemIds.length - 1) await new Promise((r) => setTimeout(r, 400));
    }
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
