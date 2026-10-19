import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWishlist } from "@/lib/db/wishlists";
import { effectivePrice } from "@/lib/items-view";
import { formatCurrency } from "@/lib/format";
import { removeFromWishlistAction } from "../actions";
import { RenameWishlistForm } from "./rename-wishlist-form";
import { DeleteWishlistButton } from "./delete-wishlist-button";
import { ShareLink } from "./share-link";

export default async function WishlistPage({
  params,
}: PageProps<"/wishlists/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const wishlist = await getWishlist(supabase, id);
  if (!wishlist) notFound();

  const items = wishlist.wishlist_items.flatMap((wi) =>
    wi.item ? [wi.item] : [],
  );
  const total = items.reduce((sum, item) => sum + effectivePrice(item), 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <Link
        href="/wishlists"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        Wishlists
      </Link>

      <RenameWishlistForm wishlistId={wishlist.id} name={wishlist.name} />
      <p className="text-muted-foreground -mt-2 text-sm">
        {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
        {formatCurrency(total)}
      </p>
      <ShareLink shareToken={wishlist.share_token} />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing on this list yet. On your{" "}
          <Link href="/" className="underline">
            wishlist
          </Link>
          , tap <strong>Select</strong>, pick items, then{" "}
          <strong>Add to wishlist</strong>.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <CardContent className="flex items-center gap-3">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{item.title}</span>
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
                    <span className="text-muted-foreground text-sm">
                      {formatCurrency(effectivePrice(item))}
                      {item.store_brand && ` · ${item.store_brand}`}
                      {item.purchased && " · Purchased"}
                      {item.gifted && " · Gifted"}
                    </span>
                  </div>
                  <form
                    action={removeFromWishlistAction.bind(
                      null,
                      wishlist.id,
                      item.id,
                    )}
                  >
                    <Button
                      type="submit"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${item.title} from ${wishlist.name}`}
                      title="Remove from list"
                    >
                      <X />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t pt-4">
        <DeleteWishlistButton wishlistId={wishlist.id} name={wishlist.name} />
      </div>
    </div>
  );
}
