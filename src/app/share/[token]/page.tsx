import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSharedWishlist } from "@/lib/db/wishlists";
import { PriceDisplay } from "../../items-list";

// Shared between generateMetadata and the page so the RPC runs once.
const loadSharedWishlist = cache(async (token: string) => {
  const supabase = await createClient();
  return getSharedWishlist(supabase, token);
});

export async function generateMetadata({
  params,
}: PageProps<"/share/[token]">): Promise<Metadata> {
  const { token } = await params;
  const wishlist = await loadSharedWishlist(token);
  return {
    title: wishlist ? wishlist.name : "Wishlist not found",
    // Share links are private-by-obscurity; keep them out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function SharedWishlistPage({
  params,
}: PageProps<"/share/[token]">) {
  const { token } = await params;
  const wishlist = await loadSharedWishlist(token);
  if (!wishlist) notFound();

  const n = wishlist.items.length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1 pt-4">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Gift className="size-4" aria-hidden />A wishlist shared with you
        </p>
        <h1 className="text-2xl font-semibold">{wishlist.name}</h1>
        <p className="text-muted-foreground text-sm">
          {n} item{n === 1 ? "" : "s"}
        </p>
      </header>

      {n === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing on this list right now. Check back later!
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {wishlist.items.map((item) => (
            <li key={item.id}>
              <Card>
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
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <span className="font-medium">{item.title}</span>
                      <PriceDisplay
                        price={item.price}
                        salePrice={item.sale_price}
                      />
                    </div>
                    {item.store_brand && (
                      <p className="text-muted-foreground text-sm">
                        {item.store_brand}
                      </p>
                    )}
                    {item.notes && <p className="text-sm">{item.notes}</p>}
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
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <footer className="text-muted-foreground mt-auto pt-8 text-center text-xs">
        Made with Cubby
      </footer>
    </div>
  );
}
