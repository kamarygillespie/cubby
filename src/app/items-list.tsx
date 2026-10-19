import Link from "next/link";
import Image from "next/image";
import {
  ExternalLink,
  Gift,
  ListChecks,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StarRating } from "@/components/star-rating";
import type { listItems } from "@/lib/db/items";
import { setItemFlag } from "./items/status-actions";
import { ItemSelectCheckbox } from "./item-selection";
import { formatCurrency } from "@/lib/format";
import { displayDiscountPercent, itemMetaParts } from "@/lib/items-view";

type Items = Awaited<ReturnType<typeof listItems>>;

// itemId → the wishlists it's on. Shown on each card so the same item isn't
// accidentally put on two people's lists (FEATURES.md, wishlist sharing).
export type ListsByItem = ReadonlyMap<string, { id: string; name: string }[]>;

export function PriceDisplay({
  price,
  salePrice,
}: {
  price: number | null;
  salePrice: number | null;
}) {
  if (price === null) return null;

  const onSale = salePrice !== null && salePrice < price;

  if (!onSale) {
    return <span className="font-medium">{formatCurrency(price)}</span>;
  }

  const discountPercent = displayDiscountPercent(price, salePrice);

  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="font-medium">{formatCurrency(salePrice)}</span>
      <span className="text-muted-foreground text-sm line-through">
        {formatCurrency(price)}
      </span>
      {discountPercent !== null && (
        <span className="bg-accent text-accent-foreground rounded px-1.5 py-0.5 text-xs font-medium">
          -{discountPercent}%
        </span>
      )}
    </span>
  );
}

function OnLists({ lists }: { lists: { id: string; name: string }[] }) {
  if (lists.length === 0) return null;
  return (
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
  );
}

export function ItemsList({
  items,
  listsByItem,
  emptyState,
}: {
  items: Items;
  listsByItem?: ListsByItem;
  emptyState?: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        {emptyState ?? "No items here."}
      </div>
    );
  }

  return (
    <ul className="flex w-full flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="has-data-checked:ring-primary has-data-checked:ring-2">
            <CardContent className="flex gap-3">
              <ItemSelectCheckbox itemId={item.id} title={item.title} />
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.title}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Wraps the price under the title when both don't fit,
                    instead of squeezing the title into a narrow column. */}
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="font-medium">{item.title}</span>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.title} link`}
                      >
                        <ExternalLink className="text-muted-foreground size-3.5" />
                      </a>
                    )}
                  </div>
                  <PriceDisplay
                    price={item.price}
                    salePrice={item.sale_price}
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {itemMetaParts(item).join(" · ")}
                </p>
                <StarRating level={item.interest_level} />
                {item.notes && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.notes}
                  </p>
                )}
                <OnLists lists={listsByItem?.get(item.id) ?? []} />
                <div className="mt-1 flex flex-wrap gap-2">
                  <form
                    action={setItemFlag.bind(
                      null,
                      item.id,
                      "purchased",
                      !item.purchased,
                    )}
                  >
                    <PendingSubmitButton
                      size="xs"
                      variant={item.purchased ? "default" : "outline"}
                    >
                      <ShoppingBag />
                      {item.purchased ? "Purchased" : "Mark purchased"}
                    </PendingSubmitButton>
                  </form>
                  <form
                    action={setItemFlag.bind(
                      null,
                      item.id,
                      "gifted",
                      !item.gifted,
                    )}
                  >
                    <PendingSubmitButton
                      size="xs"
                      variant={item.gifted ? "default" : "outline"}
                    >
                      <Gift />
                      {item.gifted ? "Gifted" : "Mark gifted"}
                    </PendingSubmitButton>
                  </form>
                  <Link
                    href={`/items/${item.id}/edit`}
                    aria-label={`Edit ${item.title}`}
                    className={buttonVariants({ variant: "ghost", size: "xs" })}
                  >
                    <Pencil />
                    Edit
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
