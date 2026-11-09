import type { Metadata } from "next";
import Link from "next/link";
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
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { listCategories } from "@/lib/db/taxonomy";
import { ItemForm } from "../../items/item-form";
import { addClosetItem } from "../../items/actions";

export const metadata: Metadata = { title: "Add to closet" };

export default async function NewClosetItemPage() {
  const supabase = await createClient();
  const [itemTypes, categories] = await Promise.all([
    listItemTypes(supabase),
    listCategories(supabase),
  ]);

  return (
    <div className="flex min-h-screen flex-col items-center gap-2 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/closet"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          Closet
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add to your closet</CardTitle>
          <CardDescription>
            Something you already own. It won&apos;t count toward your wishlist
            or spending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemForm
            itemTypesByCategory={groupItemTypesByCategory(itemTypes)}
            categories={categories}
            action={addClosetItem}
            submitLabel="Add to closet"
            pendingLabel="Adding..."
            variant="closet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
