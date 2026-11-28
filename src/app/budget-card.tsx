"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Wallet } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { budgetProgress, localMonthKey, type Purchase } from "@/lib/spending";
import { setBudgetAction } from "./budget-actions";

// The viewer's current month; null while rendering on the server.
const noSubscribe = () => () => {};
const thisMonth = () => localMonthKey(new Date().toISOString());

// Monthly budget on Totals (KAM-84): "$180 of $300 in November".
export function BudgetCard({
  budget,
  purchases,
}: {
  budget: number | null;
  purchases: Pick<Purchase, "date" | "amount">[];
}) {
  const month = useSyncExternalStore(noSubscribe, thisMonth, () => null);
  const [editing, setEditing] = useState(budget === null);
  const [value, setValue] = useState(budget === null ? "" : String(budget));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(raw: string) {
    startTransition(async () => {
      const result = await setBudgetAction(raw);
      if (result.ok) {
        setError(null);
        setEditing(raw.trim() === "");
        if (raw.trim() === "") setValue("");
      } else {
        setError(result.error);
      }
    });
  }

  const progress =
    budget !== null && month ? budgetProgress(purchases, budget, month) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Wallet className="size-4" aria-hidden />
            Monthly budget
          </p>
          {budget !== null && !editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Change
            </Button>
          )}
        </div>

        {progress && month && !editing && (
          <>
            <p className="text-lg">
              {formatCurrency(progress.spent)}{" "}
              <span className="text-muted-foreground text-sm">
                of {formatCurrency(progress.budget)} in{" "}
                {new Date(`${month}-15T12:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                })}
              </span>
            </p>
            <div
              role="progressbar"
              aria-label="Spent this month"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(progress.percent, 100)}
              className="bg-secondary h-2 overflow-hidden rounded-full"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                  progress.percent >= 100
                    ? "bg-destructive"
                    : progress.percent >= 80
                      ? "bg-brand"
                      : "bg-primary",
                )}
                style={{ width: `${Math.min(progress.percent, 100)}%` }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {progress.left >= 0
                ? `${formatCurrency(progress.left)} left this month`
                : `${formatCurrency(-progress.left)} over this month`}
            </p>
          </>
        )}

        {editing && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save(value);
            }}
          >
            <p className="text-muted-foreground text-xs">
              See what you&apos;ve spent each month against a plan, with alerts
              at 80% and 100%.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-32">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  aria-label="Monthly budget"
                  inputMode="decimal"
                  className="pl-6"
                  placeholder="300"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              {budget !== null && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => save("")}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
            {error && (
              <p role="alert" className="text-destructive text-xs">
                {error}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
