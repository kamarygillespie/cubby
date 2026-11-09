"use client";

import { useMemo, useState } from "react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  lastMonthKeys,
  monthLabel,
  purchaseYears,
  spendingByMonth,
  undatedSpending,
  yearMonthKeys,
  type Purchase,
} from "@/lib/spending";

const LAST_12 = "last12";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Spending by month (KAM-55): one series, so no legend: the title names it.
// Columns are buttons (the whole column is the hit target); hover/focus shows
// a tooltip; tapping a month shows its breakdown and purchases. A table view
// carries every value for screen readers and anyone who prefers numbers.
export function SpendingChart({ purchases }: { purchases: Purchase[] }) {
  const years = useMemo(() => purchaseYears(purchases), [purchases]);
  const [range, setRange] = useState<string>(LAST_12);
  const months = useMemo(
    () =>
      spendingByMonth(
        purchases,
        range === LAST_12
          ? lastMonthKeys(new Date())
          : yearMonthKeys(Number(range)),
      ),
    [purchases, range],
  );
  const latestWithSpend = [...months].reverse().find((m) => m.count > 0)?.key;
  const [picked, setPicked] = useState<string | null>(null);
  const selectedKey = months.some((m) => m.key === picked)
    ? picked
    : latestWithSpend;
  const selected = months.find((m) => m.key === selectedKey) ?? null;
  const max = Math.max(...months.map((m) => m.total), 0);
  const rangeTotal = months.reduce((s, m) => s + m.total, 0);
  const undated = undatedSpending(purchases);

  if (purchases.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="spending-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="spending-title" className="text-sm font-medium">
            Spending by month
          </h2>
          <p className="text-muted-foreground text-xs">
            {formatCurrency(rangeTotal)}{" "}
            {range === LAST_12 ? "in the last 12 months" : `in ${range}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="spending-range" className="sr-only">
            Time range
          </Label>
          <Select value={range} onValueChange={(v) => setRange(v as string)}>
            <SelectTrigger id="spending-range" size="sm">
              <SelectValue>
                {(v: string) => (v === LAST_12 ? "Last 12 months" : v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LAST_12}>Last 12 months</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plot: recessive top gridline with its value, baseline, 12 columns. */}
      <div className="relative">
        <div className="text-muted-foreground border-border absolute inset-x-0 top-0 border-t border-dashed text-[10px]">
          <span className="bg-background relative -top-2 pr-1">
            {formatCurrency(max)}
          </span>
        </div>
        <div className="border-border grid h-40 grid-cols-12 items-end gap-0.5 border-b pt-3">
          {months.map((m) => {
            const isSelected = m.key === selectedKey;
            const pct = max > 0 ? (m.total / max) * 100 : 0;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setPicked(m.key)}
                aria-pressed={isSelected}
                aria-label={`${monthLabel(m.key, "long")}: ${formatCurrency(m.total)} on ${plural(m.count, "item")}`}
                className="group focus-visible:ring-ring/50 relative flex h-full items-end justify-center rounded-sm outline-none focus-visible:ring-3"
              >
                <span
                  className={cn(
                    "bg-primary block w-full max-w-6 rounded-t-[4px] transition-opacity",
                    !isSelected && "opacity-55 group-hover:opacity-80",
                  )}
                  style={{ height: m.total > 0 ? `max(${pct}%, 2px)` : 0 }}
                />
                <span
                  role="tooltip"
                  className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-sm group-hover:block group-focus-visible:block"
                >
                  {monthLabel(m.key, "long")} · {formatCurrency(m.total)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-1 grid grid-cols-12 gap-0.5 text-center text-[10px]">
          {months.map((m) => (
            <span
              key={m.key}
              className={cn(
                m.key === selectedKey && "text-foreground font-medium",
              )}
            >
              {monthLabel(m.key)}
            </span>
          ))}
        </div>
      </div>

      {selected && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-sm">
            <span className="font-medium">
              {monthLabel(selected.key, "long")}
            </span>
            <span className="text-muted-foreground">
              {" · "}
              {formatCurrency(selected.total)} on{" "}
              {plural(selected.count, "item")}
            </span>
          </p>
          {selected.count > 0 ? (
            <>
              <ul className="flex flex-col gap-1">
                {selected.byCategory.map((c) => (
                  <li
                    key={c.category}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span>
                      {c.category} ({c.count})
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className="text-muted-foreground flex flex-col gap-0.5 border-t pt-2 text-xs">
                {selected.purchases.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="truncate">{p.title}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatCurrency(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Nothing bought this month.
            </p>
          )}
        </div>
      )}

      {undated.count > 0 && (
        <p className="text-muted-foreground text-xs">
          Plus {formatCurrency(undated.total)} on{" "}
          {plural(undated.count, "item")} with no purchase date.
        </p>
      )}

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">Month</th>
              <th className="py-1 text-right font-normal">Items</th>
              <th className="py-1 text-right font-normal">Spent</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key} className="border-t">
                <td className="py-1">{monthLabel(m.key, "long")}</td>
                <td className="py-1 text-right tabular-nums">{m.count}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatCurrency(m.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
