"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { refreshPriceFromPage } from "../price-actions";
import { PriceDisplay } from "../../price-display";

// Save to Cubby on something already saved: update its price from the page
// the user is looking at, which works even on stores that block Cubby.
export function RefreshPrice({
  itemId,
  title,
  savedPrice,
  savedSalePrice,
  price,
  salePrice,
  addAsNewHref,
}: {
  itemId: string;
  title: string;
  savedPrice: number | null;
  savedSalePrice: number | null;
  price: number | null;
  salePrice: number | null;
  addAsNewHref: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5 pt-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Already in your Cubby</h1>
        <p className="text-muted-foreground">{title}</p>
      </div>

      <dl className="flex flex-col gap-3 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground text-sm">Saved price</dt>
          <dd>
            {savedPrice === null ? (
              "None yet"
            ) : (
              <PriceDisplay price={savedPrice} salePrice={savedSalePrice} />
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground text-sm">On this page</dt>
          <dd>
            {price === null ? (
              "Not found"
            ) : (
              <PriceDisplay price={price} salePrice={salePrice} />
            )}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {price === null ? (
        <p role="status" className="text-muted-foreground text-sm">
          Cubby couldn&apos;t find a price on this page, so nothing has changed.
        </p>
      ) : (
        <Button
          size="lg"
          className="h-11"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await refreshPriceFromPage(
                itemId,
                price,
                salePrice,
              );
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Updating…" : "Update price"}
        </Button>
      )}

      <Link
        href={addAsNewHref}
        className={buttonVariants({
          variant: "link",
          className: "self-center",
        })}
      >
        Add as a new item instead
      </Link>
    </div>
  );
}
