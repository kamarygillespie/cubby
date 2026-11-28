import { cache } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Gift, Ruler } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSharedWishlist } from "@/lib/db/wishlists";
import { getSharedClaims } from "@/lib/db/claims";
import { getSharedListExtras } from "@/lib/db/sizes";
import { SIZE_KINDS, sizeHint } from "@/lib/sizes";
import { SharedItems, type SharedItemView } from "./shared-items";
import { GIVER_COOKIE } from "./giver-cookie";
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
  const supabase = await createClient();
  const giver = (await cookies()).get(GIVER_COOKIE)?.value ?? null;
  const [claims, extras] = await Promise.all([
    getSharedClaims(supabase, token, giver),
    // Sizes (KAM-78) and Most wanted (KAM-80).
    getSharedListExtras(supabase, token),
  ]);
  const items: SharedItemView[] = wishlist.items.map((item) => {
    const extra = extras.items.get(item.id);
    return {
      id: item.id,
      title: item.title,
      image_url: item.image_url,
      link: item.link,
      price: item.price,
      sale_price: item.sale_price,
      store_brand: item.store_brand,
      claim: claims.states.get(item.id) ?? "open",
      mostWanted: extra?.mostWanted ?? false,
      sizeHint:
        extras.sizes && extra
          ? sizeHint(extras.sizes, extra.itemType, extra.category)
          : null,
    };
  });
  const n = items.length;
  const sizeList = extras.sizes
    ? SIZE_KINDS.filter((k) => extras.sizes![k.key])
    : [];

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

      {sizeList.length > 0 && (
        <section
          aria-label="Sizes"
          className="bg-muted/50 flex flex-col gap-1 rounded-xl p-3 text-sm"
        >
          <p className="flex items-center gap-1.5 font-medium">
            <Ruler className="size-4" aria-hidden />
            Sizes
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {sizeList.map((kind) => (
              <div key={kind.key} className="contents">
                <dt className="text-muted-foreground">{kind.label}</dt>
                <dd>{extras.sizes![kind.key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {n === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing on this list right now. Check back later!
        </p>
      ) : (
        <SharedItems token={token} items={items} owner={claims.owner} />
      )}

      <GiftCardIdeas
        ideas={giftCardIdeas(wishlist.items)}
        description="Not sure which to pick? A gift card to one of these stores covers several things on this list."
        limit={3}
      />

      <footer className="text-muted-foreground mt-auto pt-8 text-center text-xs">
        Made with Cubby
      </footer>
    </div>
  );
}
