import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/lib/db/taxonomy";
import { getItem, listClosetItems, listItems } from "@/lib/db/items";
import { moreLikeThis, toRecItem } from "@/lib/recommendations";
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { listWishlists } from "@/lib/db/wishlists";
import { listOutfitsForItem } from "@/lib/db/outfits";
import { ItemForm } from "../../item-form";
import { updateItemAction } from "../../actions";
import { DeleteItemButton } from "./delete-item-button";

// Shared between generateMetadata and the page so the query runs once.
const loadItem = cache(async (id: string) => {
  const supabase = await createClient();
  return getItem(supabase, id);
});

export async function generateMetadata({
  params,
}: PageProps<"/items/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItem(id);
  return { title: item ? `Edit ${item.title}` : "Item not found" };
}

export default async function EditItemPage({
  params,
  searchParams,
}: PageProps<"/items/[id]/edit">) {
  const { id } = await params;
  // Opened from the closet → go back there after saving/deleting.
  const fromCloset = (await searchParams).from === "closet";
  const returnTo = fromCloset ? "/closet" : "/";
  const item = await loadItem(id);
  if (!item) notFound();

  const supabase = await createClient();
  const [itemTypes, categories, wishlists, outfits, wishItems, closetItems] =
    await Promise.all([
      listItemTypes(supabase),
      listCategories(supabase),
      listWishlists(supabase),
      listOutfitsForItem(supabase, item.id),
      listItems(supabase),
      listClosetItems(supabase),
    ]);
  // "More like this" (KAM-52): your other items of the same type or store.
  const candidates = [
    ...new Map(
      [...wishItems, ...closetItems].map((i) => [i.id, toRecItem(i)]),
    ).values(),
  ];
  const similar = moreLikeThis(toRecItem(item), candidates);
  const onLists = wishlists
    .filter((w) => w.wishlist_items.some((wi) => wi.item_id === item.id))
    .map((w) => w.name);

  return (
    <div className="flex min-h-screen flex-col items-center gap-2 p-4">
      <div className="w-full max-w-md">
        <Link
          href={returnTo}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          {fromCloset ? "Closet" : "Items"}
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Edit item</CardTitle>
          <CardDescription>
            {onLists.length > 0
              ? `On ${onLists.join(", ")} — changes show there too.`
              : "Category is derived automatically from the item type you pick."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {outfits.length > 0 && (
            <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
              In outfits:
              {outfits.map((o) => (
                <Link
                  key={o.id}
                  href={`/outfits/${o.id}`}
                  className="bg-accent text-accent-foreground hover:bg-accent/70 rounded px-1.5 py-0.5"
                >
                  {o.name}
                </Link>
              ))}
            </p>
          )}
          <ItemForm
            itemTypesByCategory={groupItemTypesByCategory(itemTypes)}
            categories={categories}
            action={updateItemAction.bind(null, item.id)}
            initial={item}
            submitLabel="Save changes"
            variant={item.source === "closet" ? "closet" : "wishlist"}
            returnTo={returnTo}
            pendingLabel="Saving..."
          />
        </CardContent>
      </Card>
      {similar.length > 0 && (
        <section className="w-full max-w-md" aria-labelledby="similar-title">
          <h2 id="similar-title" className="mb-2 text-sm font-medium">
            More like this
          </h2>
          <ul className="flex flex-col gap-1">
            {similar.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 text-sm">
                <Link
                  href={`/items/${s.id}/edit`}
                  className="truncate underline-offset-4 hover:underline"
                >
                  {s.title}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {s.itemType}
                  {s.store_brand && ` · ${s.store_brand}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="w-full max-w-md border-t pt-4">
        <DeleteItemButton
          itemId={item.id}
          title={item.title}
          onLists={onLists}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
