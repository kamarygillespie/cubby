import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listArchivedItems, listItems } from "@/lib/db/items";
import { isCheckInCandidate } from "@/lib/cooling-off";
import { formatTimeAgo } from "@/lib/relative-time";
import { ReviewList } from "./review-row";

export const metadata: Metadata = { title: "Still want these?" };

// Cooling-off check-in (KAM-82): older, lukewarm wishlist items, one tap
// each to keep or archive, plus everything archived so far.
export default async function CheckInPage() {
  const supabase = await createClient();
  const [items, archived] = await Promise.all([
    listItems(supabase),
    listArchivedItems(supabase),
  ]);
  const now = new Date();
  const candidates = items.filter((item) => isCheckInCandidate(item, now));
  const row = (item: (typeof items)[number], when: string) => ({
    id: item.id,
    title: item.title,
    image_url: item.image_url,
    price: item.price,
    store_brand: item.store_brand,
    age: when,
  });

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
        <h1 className="font-heading text-2xl">Still want these?</h1>
        <p className="text-muted-foreground text-sm">
          These have been on your wishlist a while without much love. Keep what
          you still want, and archive the rest. Archived items leave your
          wishlist, totals, lists and price checks, and you can restore them
          below.
        </p>
      </div>

      <ReviewList
        label="To review"
        mode="review"
        emptyText="Nothing to review right now. Your wishlist is all things you love."
        items={candidates.map((item) =>
          row(item, `added ${formatTimeAgo(item.created_at)}`),
        )}
      />
      <ReviewList
        label="Archived"
        heading="Archived"
        mode="archived"
        emptyText={null}
        items={archived.map((item) =>
          row(item, `archived ${formatTimeAgo(item.archived_at)}`),
        )}
      />
    </div>
  );
}
