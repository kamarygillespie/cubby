"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Gift, Ruler, Star } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { ClaimState } from "@/lib/claims";
import {
  BUDGETS,
  viewSharedItems,
  type Budget,
  type ShareSort,
} from "@/lib/share-view";
import { PriceDisplay } from "../../price-display";
import { ClaimControl } from "./claim-control";

export type SharedItemView = {
  id: string;
  title: string;
  image_url: string | null;
  link: string | null;
  price: number | null;
  sale_price: number | null;
  store_brand: string | null;
  claim: ClaimState;
  mostWanted: boolean;
  sizeHint: string | null;
};

const SORTS: { value: ShareSort; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        pressed
          ? "bg-primary text-primary-foreground border-primary"
          : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

// The share page's items (KAM-77, KAM-78, KAM-80): budget filter and sort
// for givers, Most wanted badges, the matching size, and claiming.
export function SharedItems({
  token,
  items,
  owner,
}: {
  token: string;
  items: SharedItemView[];
  // The signed-in owner previewing their own list: no claiming.
  owner: boolean;
}) {
  const [budget, setBudget] = useState<Budget>(null);
  const [sort, setSort] = useState<ShareSort>("suggested");
  const shown = viewSharedItems(
    items.map((item) => ({ ...item, claimed: item.claim === "taken" })),
    budget,
    sort,
  );

  return (
    <div className="flex flex-col gap-3">
      {items.length > 1 && (
        <div className="flex flex-col gap-2" aria-label="Filter and sort">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Budget"
          >
            <Chip pressed={budget === null} onClick={() => setBudget(null)}>
              Any price
            </Chip>
            {BUDGETS.map((b) => (
              <Chip key={b} pressed={budget === b} onClick={() => setBudget(b)}>
                Under ${b}
              </Chip>
            ))}
          </div>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ShareSort)}
              className="bg-background text-foreground rounded-md border px-2 py-1"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing under ${budget} on this list.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setBudget(null)}
          >
            Show everything
          </button>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((item) => (
            <li key={item.id}>
              <Card className={item.claimed ? "opacity-70" : undefined}>
                <CardContent className="flex gap-3">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      width={80}
                      height={80}
                      className="size-20 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {item.mostWanted && (
                      <span className="text-brand flex items-center gap-1 text-xs font-semibold">
                        <Star className="size-3.5 fill-current" aria-hidden />
                        Most wanted
                      </span>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <span className="font-medium">{item.title}</span>
                      <PriceDisplay
                        price={item.price}
                        salePrice={item.sale_price}
                      />
                    </div>
                    {(item.store_brand || item.sizeHint) && (
                      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
                        {item.store_brand && <span>{item.store_brand}</span>}
                        {item.sizeHint && (
                          <span className="flex items-center gap-1">
                            <Ruler className="size-3.5" aria-hidden />
                            {item.sizeHint}
                          </span>
                        )}
                      </p>
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "mt-1 self-start",
                        })}
                      >
                        View item
                        <ExternalLink />
                      </a>
                    )}
                    {owner ? (
                      item.claim === "taken" && (
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                          <Gift className="size-4" aria-hidden />
                          Claimed by a giver
                        </p>
                      )
                    ) : (
                      <ClaimControl
                        // Remount when the server's answer changes.
                        key={item.claim}
                        token={token}
                        itemId={item.id}
                        title={item.title}
                        initialState={item.claim}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
