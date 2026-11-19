"use client";

import { useOptimistic, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Gift,
  ListChecks,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StarRating } from "@/components/star-rating";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { listItems } from "@/lib/db/items";
import { formatCurrency } from "@/lib/format";
import { displayDiscountPercent, itemMetaParts } from "@/lib/items-view";
import { formatTimeAgo } from "@/lib/relative-time";
import { CheckPriceButton } from "./check-price";
import { ItemSelectCheckbox, useItemSelection } from "./item-selection";
import { setItemFlag } from "./items/status-actions";
import { DeleteItemButton } from "./items/[id]/edit/delete-item-button";
import { PriceDisplay } from "./price-display";

export type Item = Awaited<ReturnType<typeof listItems>>[number];
type ItemList = { id: string; name: string };

// A photo-first card in the item grid (KAM-59). Tapping it opens the item's
// details and actions; in Select mode, tapping selects it instead.
export function ItemCard({
  item,
  lists,
  priceCheckFailed,
}: {
  item: Item;
  lists: ItemList[];
  priceCheckFailed: boolean;
}) {
  const selection = useItemSelection();
  const selecting = selection?.selecting ?? false;
  const selected = selection?.selected.has(item.id) ?? false;

  const [open, setOpen] = useState(false);
  // Mounted on first open only, so a long list doesn't build every sheet.
  const [everOpened, setEverOpened] = useState(false);

  const discount = displayDiscountPercent(item.price, item.sale_price);
  const onSale = discount !== null && item.sale_price !== null;

  return (
    <div className="relative">
      <ItemSelectCheckbox itemId={item.id} title={item.title} />
      <button
        type="button"
        aria-haspopup={selecting ? undefined : "dialog"}
        className="group flex w-full flex-col gap-2 text-left transition-transform duration-150 outline-none active:scale-[0.98] motion-reduce:transform-none"
        onClick={() => {
          if (selecting) {
            selection?.toggle(item.id, !selected);
            return;
          }
          setEverOpened(true);
          setOpen(true);
        }}
      >
        <span className="bg-secondary ring-foreground/5 relative block aspect-square w-full overflow-hidden rounded-2xl ring-1">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt=""
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
              // Fades in only if it's still loading. A photo that's already
              // there (or one whose load event was missed) is never hidden.
              ref={(image) => {
                if (image && !image.complete) image.style.opacity = "0";
              }}
              onLoad={(event) => {
                event.currentTarget.style.opacity = "";
              }}
              className="object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          ) : (
            <span
              className="text-muted-foreground/70 font-heading absolute inset-0 flex items-center justify-center text-5xl"
              aria-hidden
            >
              {item.title.trim().charAt(0).toUpperCase()}
            </span>
          )}
          {onSale && (
            <span className="bg-brand text-brand-foreground absolute right-2 bottom-2 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm">
              -{discount}%
            </span>
          )}
          {/* Drawn inside the photo so the card's edge can't clip it. */}
          <span
            className={cn(
              "group-focus-visible:ring-ring/50 pointer-events-none absolute inset-0 rounded-2xl ring-inset group-focus-visible:ring-3",
              selected && "ring-primary ring-3",
            )}
            aria-hidden
          />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{item.title}</span>
          {item.price !== null && (
            <span className="flex items-baseline gap-1.5 text-sm">
              <span className={cn(onSale && "text-brand font-medium")}>
                {formatCurrency(onSale ? item.sale_price! : item.price)}
              </span>
              {onSale && (
                <span className="text-muted-foreground text-xs line-through">
                  {formatCurrency(item.price)}
                </span>
              )}
            </span>
          )}
          {/* Kept for screen readers; the sheet shows these visually. */}
          <span className="sr-only">
            {itemMetaParts(item).join(" · ")}
            {item.interest_level ? `, ${item.interest_level} of 5 stars` : ""}
          </span>
        </span>
      </button>

      {everOpened && (
        <ItemSheet
          item={item}
          lists={lists}
          priceCheckFailed={priceCheckFailed}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  );
}

function ItemSheet({
  item,
  lists,
  priceCheckFailed,
  open,
  onOpenChange,
}: {
  item: Item;
  lists: ItemList[];
  priceCheckFailed: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const canCheckPrice = item.link && !item.purchased && !item.gifted;

  // A brief moment of delight when something is bought or gifted (KAM-62).
  const [celebrating, setCelebrating] = useOptimistic<
    "purchased" | "gifted" | null
  >(null);

  // Closes once saved, whether or not the item stays on this tab.
  async function setFlag(field: "purchased" | "gifted", value: boolean) {
    if (value) setCelebrating(field);
    await Promise.all([
      setItemFlag(item.id, field, value),
      value ? new Promise((resolve) => setTimeout(resolve, 700)) : null,
    ]);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {celebrating && (
          <div
            role="status"
            className="bg-popover/95 motion-safe:animate-in motion-safe:fade-in-0 absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 duration-200"
          >
            <span className="bg-brand text-brand-foreground motion-safe:animate-in motion-safe:zoom-in-50 flex size-16 items-center justify-center rounded-full duration-300">
              <Check className="size-8" aria-hidden />
            </span>
            <p className="font-heading text-2xl">
              {celebrating === "purchased" ? "It's yours!" : "Gifted!"}
            </p>
          </div>
        )}
        {item.image_url && (
          <div className="bg-muted relative h-56 w-full shrink-0 overflow-hidden rounded-xl sm:h-64">
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              sizes="(min-width: 640px) 416px, 100vw"
              className="object-contain"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <SheetTitle>{item.title}</SheetTitle>
          <SheetDescription>{itemMetaParts(item).join(" · ")}</SheetDescription>
          <div className="flex flex-wrap items-center justify-between gap-2 text-base">
            <PriceDisplay price={item.price} salePrice={item.sale_price} />
            <StarRating level={item.interest_level} />
          </div>
        </div>

        {item.notes && <p className="text-muted-foreground">{item.notes}</p>}

        {lists.length > 0 && (
          <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <ListChecks className="size-3.5" aria-hidden />
            <span>On</span>
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/wishlists/${list.id}`}
                className="bg-accent text-accent-foreground hover:bg-accent/70 rounded px-1.5 py-0.5"
              >
                {list.name}
              </Link>
            ))}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <form action={() => setFlag("purchased", !item.purchased)}>
            <PendingSubmitButton
              size="lg"
              className="h-10 w-full"
              variant={item.purchased ? "default" : "outline"}
            >
              <ShoppingBag />
              {item.purchased ? "Purchased" : "Mark purchased"}
            </PendingSubmitButton>
          </form>
          <form action={() => setFlag("gifted", !item.gifted)}>
            <PendingSubmitButton
              size="lg"
              className="h-10 w-full"
              variant={item.gifted ? "default" : "outline"}
            >
              <Gift />
              {item.gifted ? "Gifted" : "Mark gifted"}
            </PendingSubmitButton>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${item.title} link`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ExternalLink />
              Open link
            </a>
          )}
          <Link
            href={`/items/${item.id}/edit`}
            aria-label={`Edit ${item.title}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Pencil />
            Edit
          </Link>
          {canCheckPrice && (
            <CheckPriceButton
              itemId={item.id}
              title={item.title}
              checkedAgo={formatTimeAgo(item.price_checked_at)}
              lastCheckFailed={priceCheckFailed}
            />
          )}
        </div>

        <div className="flex justify-center border-t pt-3">
          <DeleteItemButton
            itemId={item.id}
            title={item.title}
            onLists={lists.map((list) => list.name)}
            returnTo={null}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
