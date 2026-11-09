import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listItems } from "@/lib/db/items";
import { listFavoriteStores } from "@/lib/db/stores";
import { activeWishlistItems } from "@/lib/items-view";
import { summarizeStores } from "@/lib/stores";
import { formatCurrency } from "@/lib/format";
import { FavoriteStar, SaleUrlEditor } from "./store-controls";

export const metadata: Metadata = { title: "Stores" };

export default async function StoresPage() {
  const supabase = await createClient();
  const [items, favorites] = await Promise.all([
    listItems(supabase),
    listFavoriteStores(supabase),
  ]);
  const stores = summarizeStores(activeWishlistItems(items), favorites);
  const onSaleNow = stores.filter((s) => s.onSaleCount > 0).length;

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
      <div>
        <h1 className="text-xl font-semibold">Stores</h1>
        <p className="text-muted-foreground text-sm">
          {stores.length === 0
            ? "Stores appear here from the store/brand on your wishlist items."
            : `${stores.length} store${stores.length === 1 ? "" : "s"}${onSaleNow ? ` · ${onSaleNow} running a sale on something you want` : ""}. Star your favorites. Prices are re-checked daily.`}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {stores.map((store) => (
          <li key={store.key}>
            <Card>
              <CardContent className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <FavoriteStar name={store.name} favorite={store.favorite} />
                  <span className="font-medium">{store.name}</span>
                  {store.onSaleCount > 0 && (
                    <span className="bg-accent text-accent-foreground ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                      <Tag className="size-3" aria-hidden />
                      {store.onSaleCount} on sale · up to {store.bestDiscount}%
                      off
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground pl-10 text-sm">
                  {store.itemCount === 0
                    ? "Nothing on your wishlist right now"
                    : `${store.itemCount} item${store.itemCount === 1 ? "" : "s"} · ${formatCurrency(store.total)}`}
                  {store.itemCount > 0 && (
                    <>
                      {" · "}
                      <Link
                        href={`/?store=${encodeURIComponent(store.key)}`}
                        className="underline-offset-4 hover:underline"
                      >
                        View items
                      </Link>
                    </>
                  )}
                </p>
                {store.favorite && (
                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    {store.saleUrl && (
                      <a
                        href={store.saleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({
                          size: "xs",
                          variant: "outline",
                        })}
                      >
                        Sale page
                        <ExternalLink />
                      </a>
                    )}
                    <SaleUrlEditor
                      storeKey={store.key}
                      name={store.name}
                      saleUrl={store.saleUrl}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
