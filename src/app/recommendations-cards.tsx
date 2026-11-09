import Link from "next/link";
import { Sparkles, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { effectivePrice } from "@/lib/items-view";
import type { BuyNextPick, TasteProfile } from "@/lib/recommendations";

export function BuyNextCard({ picks }: { picks: BuyNextPick[] }) {
  if (picks.length === 0) return null;
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden />
          <h2 className="text-sm font-medium">Buy next</h2>
        </div>
        <p className="text-muted-foreground text-xs">
          From your wishlist: what you love most, what&apos;s on sale or just
          dropped, and what fits what you actually buy.
        </p>
        <ol className="flex flex-col gap-2">
          {picks.map(({ item, reasons }) => (
            <li key={item.id} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link
                  href={`/items/${item.id}/edit`}
                  className="truncate font-medium underline-offset-4 hover:underline"
                >
                  {item.title}
                </Link>
                {item.price !== null && (
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(effectivePrice(item))}
                  </span>
                )}
              </div>
              {reasons.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  {reasons.join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function TasteCard({ taste }: { taste: TasteProfile }) {
  if (taste.purchaseCount < 3) return null; // not enough to say anything yet
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <User className="size-4" aria-hidden />
          <h2 className="text-sm font-medium">Your taste</h2>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Mostly</dt>
          <dd>
            {taste.topCategories
              .map((c) => `${c.name} (${c.share}%)`)
              .join(", ")}
          </dd>
          {taste.topStores.length > 0 && (
            <>
              <dt className="text-muted-foreground">Go-to stores</dt>
              <dd>{taste.topStores.map((s) => s.name).join(", ")}</dd>
            </>
          )}
          {taste.priceRange && (
            <>
              <dt className="text-muted-foreground">Usually spend</dt>
              <dd>
                {formatCurrency(taste.priceRange.low)}–
                {formatCurrency(taste.priceRange.high)} per item
              </dd>
            </>
          )}
        </dl>
        <p className="text-muted-foreground text-xs">
          From {taste.purchaseCount} things you&apos;ve bought.
        </p>
      </CardContent>
    </Card>
  );
}
