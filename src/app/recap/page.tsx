import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listClosetItems, listItems } from "@/lib/db/items";
import { listWearCounts } from "@/lib/db/wears";
import type { RecapItem } from "@/lib/recap";
import { RecapCards } from "./recap-cards";

export const metadata: Metadata = { title: "Year in Cubby" };

// Year in Cubby (KAM-86). The numbers are worked out in the browser (see
// RecapCards), so the year follows the viewer's time zone.
export default async function RecapPage({ searchParams }: PageProps<"/recap">) {
  const raw = (await searchParams).year;
  const parsed = typeof raw === "string" ? Number(raw) : NaN;
  const year =
    Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100
      ? parsed
      : new Date().getFullYear();

  const supabase = await createClient();
  const [items, closet, wears] = await Promise.all([
    listItems(supabase),
    listClosetItems(supabase),
    listWearCounts(supabase, `${year}-01-01`),
  ]);
  const recapItems: RecapItem[] = items.map((i) => ({
    title: i.title,
    createdAt: i.created_at,
    purchasedAt: i.purchased_date,
    purchased: i.purchased,
    gifted: i.gifted,
    price: i.price,
    salePrice: i.sale_price,
    interest: i.interest_level,
    store: i.store_brand,
    category: i.item_type.category.name,
  }));
  // Wears counted from Jan 1 (UTC) of the year; good enough at year scale.
  const wearsThisYear = closet
    .map((piece) => ({ title: piece.title, wears: wears.get(piece.id) ?? 0 }))
    .filter((w) => w.wears > 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4">
      <Link
        href="/?view=totals"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        Totals
      </Link>
      <RecapCards items={recapItems} wears={wearsThisYear} year={year} />
    </div>
  );
}
