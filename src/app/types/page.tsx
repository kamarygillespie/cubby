import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listTaxonomy } from "@/lib/db/taxonomy";
import {
  AddItemTypeForm,
  CreateCategoryForm,
  TaxonomyRow,
} from "./taxonomy-controls";

export const metadata: Metadata = { title: "Item types" };

export default async function TypesPage() {
  const taxonomy = await listTaxonomy(await createClient());
  const mergeTargets = taxonomy.map((c) => ({
    category: c.name,
    itemTypes: c.item_types.map((t) => ({ id: t.id, name: t.name })),
  }));

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
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Item types</h1>
        <p className="text-muted-foreground text-sm">
          Built-in types can&apos;t be changed. Add your own anywhere, or make a
          new category for them.
        </p>
      </div>
      <CreateCategoryForm />

      <ul className="flex flex-col gap-3">
        {taxonomy.map((category) => (
          <li key={category.id}>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <TaxonomyRow
                  kind="category"
                  id={category.id}
                  name={category.name}
                  isSystem={category.is_system}
                  detail={`${category.item_types.length} type${category.item_types.length === 1 ? "" : "s"}`}
                  canDelete={category.item_types.length === 0}
                  heading
                />
                <ul className="flex flex-col gap-1 border-t pt-2">
                  {category.item_types.map((type) => (
                    <li key={type.id}>
                      <TaxonomyRow
                        kind="item type"
                        id={type.id}
                        name={type.name}
                        isSystem={type.is_system}
                        detail={`${type.itemCount} item${type.itemCount === 1 ? "" : "s"}`}
                        canDelete={type.itemCount === 0}
                        mergeTargets={mergeTargets}
                      />
                    </li>
                  ))}
                </ul>
                <AddItemTypeForm categoryId={category.id} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
