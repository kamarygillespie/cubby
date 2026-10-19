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
import { getItem } from "@/lib/db/items";
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { listWishlists } from "@/lib/db/wishlists";
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
}: PageProps<"/items/[id]/edit">) {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) notFound();

  const supabase = await createClient();
  const [itemTypes, wishlists] = await Promise.all([
    listItemTypes(supabase),
    listWishlists(supabase),
  ]);
  const onLists = wishlists
    .filter((w) => w.wishlist_items.some((wi) => wi.item_id === item.id))
    .map((w) => w.name);

  return (
    <div className="flex min-h-screen flex-col items-center gap-2 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          Items
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
        <CardContent>
          <ItemForm
            itemTypesByCategory={groupItemTypesByCategory(itemTypes)}
            action={updateItemAction.bind(null, item.id)}
            initial={item}
            submitLabel="Save changes"
            pendingLabel="Saving..."
          />
        </CardContent>
      </Card>
      <div className="w-full max-w-md border-t pt-4">
        <DeleteItemButton
          itemId={item.id}
          title={item.title}
          onLists={onLists}
        />
      </div>
    </div>
  );
}
