import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { ItemForm } from "../item-form";
import { addItem } from "../actions";

export const metadata: Metadata = { title: "Add item" };

export default async function NewItemPage() {
  const supabase = await createClient();
  const itemTypes = await listItemTypes(supabase);

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
          <CardTitle>Add item</CardTitle>
          <CardDescription>
            Category is derived automatically from the item type you pick.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemForm
            itemTypesByCategory={groupItemTypesByCategory(itemTypes)}
            action={addItem}
            submitLabel="Add item"
            pendingLabel="Adding..."
            withAutofill
          />
        </CardContent>
      </Card>
    </div>
  );
}
