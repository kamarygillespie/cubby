import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Gift, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import type { listItems } from "@/lib/db/items";
import { setItemFlag } from "./items/status-actions";
import { ItemSelectCheckbox } from "./item-selection";

type Items = Awaited<ReturnType<typeof listItems>>;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function PriceDisplay({
  price,
  salePrice,
  discountPercent,
}: {
  price: number | null;
  salePrice: number | null;
  discountPercent: number | null;
}) {
  if (price === null) return null;

  const onSale = salePrice !== null && salePrice < price;

  if (!onSale) {
    return <span className="font-medium">{currency.format(price)}</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <span className="font-medium">{currency.format(salePrice)}</span>
      <span className="text-muted-foreground text-sm line-through">
        {currency.format(price)}
      </span>
      {discountPercent !== null && (
        <span className="bg-accent text-accent-foreground rounded px-1.5 py-0.5 text-xs font-medium">
          -{discountPercent}%
        </span>
      )}
    </span>
  );
}

export function ItemsList({ items }: { items: Items }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No items yet.{" "}
        <Link href="/items/new" className="underline">
          Add your first one
        </Link>
        .
      </p>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
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
                    discountPercent={item.discount_percent}
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {item.item_type.name}
                  {" · "}
                  {item.item_type.category.name}
                  {item.store_brand && ` · ${item.store_brand}`}
                </p>
                <StarRating level={item.interest_level} />
                {item.notes && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.notes}
                  </p>
                )}
                <div className="mt-1 flex gap-2">
                  <form
                    action={setItemFlag.bind(
                      null,
                      item.id,
                      "purchased",
                      !item.purchased,
                    )}
                  >
                    <Button
                      type="submit"
                      size="xs"
                      variant={item.purchased ? "default" : "outline"}
                    >
                      <ShoppingBag />
                      {item.purchased ? "Purchased" : "Mark purchased"}
                    </Button>
                  </form>
                  <form
                    action={setItemFlag.bind(
                      null,
                      item.id,
                      "gifted",
                      !item.gifted,
                    )}
                  >
                    <Button
                      type="submit"
                      size="xs"
                      variant={item.gifted ? "default" : "outline"}
                    >
                      <Gift />
                      {item.gifted ? "Gifted" : "Mark gifted"}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
