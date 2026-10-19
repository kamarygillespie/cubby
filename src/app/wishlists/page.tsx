import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listItems } from "@/lib/db/items";
import { listWishlists } from "@/lib/db/wishlists";
import { effectivePrice } from "@/lib/items-view";
import { formatCurrency } from "@/lib/format";
import { CreateWishlistForm } from "./create-wishlist-form";

export default async function WishlistsPage() {
  const supabase = await createClient();
  const [wishlists, items] = await Promise.all([
    listWishlists(supabase),
    listItems(supabase),
  ]);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <Link
        href="/"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        Items
      </Link>
      <h1 className="text-xl font-semibold">Wishlists</h1>
      <CreateWishlistForm />

      {wishlists.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No wishlists yet. Create one above, or use <strong>Select</strong> on
          your items to add them to a new list.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {wishlists.map((list) => {
            const entries = list.wishlist_items.flatMap((wi) => {
              const item = itemsById.get(wi.item_id);
              return item ? [item] : [];
            });
            const total = entries.reduce(
              (sum, item) => sum + effectivePrice(item),
              0,
            );
            const n = entries.length;
            return (
              <li key={list.id}>
                <Link href={`/wishlists/${list.id}`} className="group block">
                  <Card className="group-hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{list.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {n} item{n === 1 ? "" : "s"} · {formatCurrency(total)}
                        </span>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
