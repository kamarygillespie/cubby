import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listItemTypes } from "@/lib/db/item-types";
import { AddItemForm } from "./add-item-form";

export const metadata: Metadata = { title: "Add item" };

export default async function NewItemPage() {
  const supabase = await createClient();
  const itemTypes = await listItemTypes(supabase);

  const byCategory = new Map<
    string,
    { category: string; itemTypes: typeof itemTypes }
  >();
  for (const itemType of itemTypes) {
    const categoryName = itemType.category?.name ?? "Uncategorized";
    const group = byCategory.get(categoryName) ?? {
      category: categoryName,
      itemTypes: [],
    };
    group.itemTypes.push(itemType);
    byCategory.set(categoryName, group);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add item</CardTitle>
          <CardDescription>
            Category is derived automatically from the item type you pick.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddItemForm itemTypesByCategory={[...byCategory.values()]} />
        </CardContent>
      </Card>
    </div>
  );
}
