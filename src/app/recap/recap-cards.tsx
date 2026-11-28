"use client";

import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/format";
import { recapShareText, yearRecap, type RecapItem } from "@/lib/recap";

function Card({
  eyebrow,
  big,
  children,
}: {
  eyebrow: string;
  big: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="bg-card flex min-h-72 w-[85%] shrink-0 snap-center flex-col justify-center gap-2 rounded-3xl border p-6 shadow-sm sm:w-full">
      <p className="text-muted-foreground text-sm">{eyebrow}</p>
      <p className="font-heading text-4xl leading-tight">{big}</p>
      {children && <div className="text-muted-foreground">{children}</div>}
    </li>
  );
}

// Year in Cubby's cards (KAM-86): swipe sideways on a phone, scroll on a
// desktop. Cards with nothing to say are skipped.
export function RecapCards({
  items,
  wears,
  year,
}: {
  items: RecapItem[];
  wears: { title: string; wears: number }[];
  year: number;
}) {
  const recap = useMemo(
    () => yearRecap(items, wears, year),
    [items, wears, year],
  );
  const [includeAmounts, setIncludeAmounts] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const text = recapShareText(recap, { includeAmounts });

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `My ${year} in Cubby`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus("Copied. Paste it anywhere to share.");
    } catch (error) {
      // Closing the share sheet isn't an error worth showing.
      if ((error as Error)?.name !== "AbortError") {
        setStatus("Couldn't share. Try again.");
      }
    }
  }

  if (recap.added === 0 && recap.bought === 0) {
    return (
      <div className="flex flex-col gap-2 py-8">
        <h1 className="font-heading text-3xl">Your {year} in Cubby</h1>
        <p className="text-muted-foreground">
          Nothing to look back on for {year} yet. Add some things you love and
          check back in December.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl">Your {year} in Cubby</h1>
      <ul
        aria-label={`Your ${year} in Cubby`}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 motion-reduce:scroll-auto sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0"
      >
        <Card
          eyebrow="This year you added"
          big={`${recap.added} thing${recap.added === 1 ? "" : "s"}`}
        >
          to your wishlist, and bought {recap.bought}.
        </Card>
        {recap.bought > 0 && (
          <Card eyebrow="You spent" big={formatCurrency(recap.spent)}>
            {recap.saved > 0
              ? `and saved ${formatCurrency(recap.saved)} by waiting for sales.`
              : "on things from your wishlist."}
          </Card>
        )}
        {recap.topStore && (
          <Card eyebrow="Your top store" big={recap.topStore.name}>
            {recap.topStore.count} things from there this year.
            {recap.topCategory &&
              ` Your favorite category: ${recap.topCategory.name}.`}
          </Card>
        )}
        {recap.cameTrue && (
          <Card eyebrow="A wish come true" big={recap.cameTrue.title}>
            {"★".repeat(recap.cameTrue.interest)} on your wishlist, and now
            it&apos;s yours.
          </Card>
        )}
        {recap.mostWorn && (
          <Card eyebrow="Your most-worn piece" big={recap.mostWorn.title}>
            Worn {recap.mostWorn.wears} time
            {recap.mostWorn.wears === 1 ? "" : "s"} this year.
          </Card>
        )}
      </ul>

      <section
        aria-label="Share"
        className="flex flex-col gap-2 rounded-2xl border p-4"
      >
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeAmounts}
            onCheckedChange={(checked) => {
              setIncludeAmounts(checked === true);
              setStatus(null);
            }}
          />
          Include amounts
        </label>
        <pre className="bg-muted text-muted-foreground rounded-lg p-3 text-xs whitespace-pre-wrap">
          {text}
        </pre>
        <Button className="self-start" onClick={share}>
          <Share2 />
          Share my year
        </Button>
        {status && (
          <p role="status" className="text-muted-foreground text-xs">
            {status}
          </p>
        )}
      </section>
    </div>
  );
}
