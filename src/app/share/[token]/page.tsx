import { cache } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSharedWishlist } from "@/lib/db/wishlists";
import { getSharedClaims } from "@/lib/db/claims";
import { ClaimControl } from "./claim-control";
import { GIVER_COOKIE } from "./giver-cookie";
import { PriceDisplay } from "../../price-display";
import { GiftCardIdeas } from "@/components/gift-card-ideas";
import { giftCardIdeas } from "@/lib/stores";

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

  // Gift claims (KAM-77). Empty for the list's owner unless they turned on
  // Show claims, so previewing your own list never spoils a surprise.
  const giver = (await cookies()).get(GIVER_COOKIE)?.value ?? null;
  const claims = await getSharedClaims(await createClient(), token, giver);
  const stateOf = (id: string) => claims.states.get(id) ?? "open";
  // Items still up for grabs first; same order otherwise.
  const items = [...wishlist.items].sort(
    (a, b) =>
      Number(stateOf(a.id) === "taken") - Number(stateOf(b.id) === "taken"),
  );

  const n = items.length;

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
        {claims.owner && (
          <p className="bg-muted text-muted-foreground mt-2 rounded-lg p-3 text-sm">
            This is your list. Givers can tap <b>I&apos;m getting this</b> here
            so nobody doubles up. Claims stay hidden from you unless you turn on{" "}
            <b>Show claims</b> on your Lists page.
          </p>
        )}
      </header>

      {n === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing on this list right now. Check back later!
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card
                className={
                  stateOf(item.id) === "taken" ? "opacity-70" : undefined
                }
              >
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
                    {claims.owner ? (
                      stateOf(item.id) === "taken" && (
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                          <Gift className="size-4" aria-hidden />
                          Claimed by a giver
                        </p>
                      )
                    ) : (
                      <ClaimControl
                        // Remount when the server's answer changes.
                        key={stateOf(item.id)}
                        token={token}
                        itemId={item.id}
                        title={item.title}
                        initialState={stateOf(item.id)}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <GiftCardIdeas
        ideas={giftCardIdeas(items)}
        description="Not sure which to pick? A gift card to one of these stores covers several things on this list."
        limit={3}
      />

      <footer className="text-muted-foreground mt-auto pt-8 text-center text-xs">
        Made with Cubby
      </footer>
    </div>
  );
}
