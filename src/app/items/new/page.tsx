import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/lib/db/taxonomy";
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { addItem } from "../actions";
import { AddItemFlow } from "./add-item-flow";
import { sharedLinkFromParams } from "@/lib/item-form";
import { parseCapture } from "@/lib/page-capture";
import { findItemByProductLink } from "@/lib/db/items";
import { RefreshPrice } from "./refresh-price";
import { getLookingFor } from "@/lib/db/looking-for";

export const metadata: Metadata = { title: "Add item" };

export default async function NewItemPage({
  searchParams,
}: PageProps<"/items/new">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const sharedLink = sharedLinkFromParams({
    url: one(params.url),
    text: one(params.text),
  });
  const rawCapture = one(params.capture);
  const captured = parseCapture(rawCapture);
  const supabase = await createClient();
  const [itemTypes, categories, existing, lookingFor] = await Promise.all([
    listItemTypes(supabase),
    listCategories(supabase),
    captured && one(params.new) !== "1"
      ? findItemByProductLink(supabase, captured.link)
      : null,
    // "Found it" from the Looking for list (KAM-102).
    one(params.lookingFor)
      ? getLookingFor(supabase, one(params.lookingFor)!)
      : null,
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-2 p-4">
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
      {captured && existing ? (
        <RefreshPrice
          itemId={existing.id}
          title={existing.title}
          savedPrice={existing.price}
          savedSalePrice={existing.sale_price}
          price={captured.price}
          salePrice={captured.salePrice}
          addAsNewHref={`/items/new?capture=${rawCapture}&new=1`}
        />
      ) : (
        <AddItemFlow
          itemTypesByCategory={groupItemTypesByCategory(itemTypes)}
          categories={categories}
          action={addItem}
          sharedLink={captured ? null : sharedLink}
          captured={captured}
          lookingFor={
            lookingFor && !lookingFor.found_at
              ? {
                  id: lookingFor.id,
                  title: lookingFor.title,
                  notes: lookingFor.notes,
                  itemTypeId: lookingFor.item_type_id,
                }
              : null
          }
        />
      )}
    </div>
  );
}
