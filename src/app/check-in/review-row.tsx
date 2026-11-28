"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Archive, Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { archiveAction, keepAction, restoreAction } from "./actions";

// One item in the check-in (KAM-82): Keep or Archive, or Restore.
export function ReviewRow({
  item,
  mode,
}: {
  item: {
    id: string;
    title: string;
    image_url: string | null;
    price: number | null;
    store_brand: string | null;
    age: string;
  };
  mode: "review" | "archived";
}) {
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const act = (fn: () => Promise<void>, message: string) =>
    startTransition(async () => {
      await fn();
      setDone(message);
    });

  return (
    <li className="bg-card flex items-center gap-3 rounded-xl border p-3">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="bg-secondary text-muted-foreground font-heading flex size-14 shrink-0 items-center justify-center rounded-lg text-xl">
          {item.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{item.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {[
            item.store_brand,
            item.price !== null ? formatCurrency(item.price) : null,
            item.age,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      {done ? (
        <span role="status" className="text-muted-foreground text-xs">
          {done}
        </span>
      ) : mode === "review" ? (
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={`Keep ${item.title}`}
            onClick={() => act(() => keepAction(item.id), "Kept")}
          >
            <Heart />
            Keep
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={`Archive ${item.title}`}
            onClick={() => act(() => archiveAction(item.id), "Archived")}
          >
            <Archive />
            Archive
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          aria-label={`Restore ${item.title}`}
          onClick={() =>
            act(() => restoreAction(item.id), "Back on your wishlist")
          }
        >
          <RotateCcw />
          Restore
        </Button>
      )}
    </li>
  );
}

type Row = Parameters<typeof ReviewRow>[0]["item"];

// The rows as they were when the page opened, so each one stays in place
// showing what happened ("Kept", "Archived") while the user works down the
// list, even though the page's data refreshes behind it.
export function ReviewList({
  items,
  mode,
  label,
  heading,
  emptyText,
}: {
  items: Row[];
  mode: "review" | "archived";
  label: string;
  // Shown above the list (the Archived section's title).
  heading?: string;
  // Shown when the page opened with nothing here; null hides the section.
  emptyText: string | null;
}) {
  const [rows] = useState(items);
  if (rows.length === 0) {
    return emptyText ? (
      <p className="text-muted-foreground text-sm">{emptyText}</p>
    ) : null;
  }
  return (
    <section className="flex flex-col gap-2">
      {heading && <h2 className="text-sm font-medium">{heading}</h2>}
      <ul className="flex flex-col gap-2" aria-label={label}>
        {rows.map((item) => (
          <ReviewRow key={item.id} item={item} mode={mode} />
        ))}
      </ul>
    </section>
  );
}
