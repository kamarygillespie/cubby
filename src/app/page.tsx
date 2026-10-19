import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { listItems } from "@/lib/db/items";
import { listItemTypes } from "@/lib/db/item-types";
import {
  filterByView,
  filterItems,
  groupByCategory,
  groupByItemType,
  sortItems,
  type ItemView,
  type SortOption,
} from "@/lib/items-view";
import { ItemsList } from "./items-list";
import { ItemsGroupedList } from "./items-grouped-list";
import { FilterBar } from "./filter-bar";
import { ViewTabs } from "./view-tabs";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const categoryId = firstParam(params.category) ?? null;
  const itemTypeId = firstParam(params.itemType) ?? null;
  const onSaleOnly = firstParam(params.onSale) === "1";
  const sort = (firstParam(params.sort) as SortOption | undefined) ?? null;
  const group = firstParam(params.group);
  const view = (firstParam(params.view) as ItemView | undefined) ?? "wishlist";

  const [items, itemTypes] = await Promise.all([
    listItems(supabase),
    listItemTypes(supabase),
  ]);

  const categories = [
    ...new Map(itemTypes.map((t) => [t.category.id, t.category])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const visibleItems = sortItems(
    filterItems(filterByView(items, view), {
      categoryId,
      itemTypeId,
      onSaleOnly,
    }),
    sort,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Signed in as {user.email}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/items/new"
            className={buttonVariants({ variant: "default" })}
          >
            Add item
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </div>
      <ViewTabs />
      <FilterBar categories={categories} itemTypes={itemTypes} />
      {group === "category" ? (
        <ItemsGroupedList groups={groupByCategory(visibleItems)} />
      ) : group === "itemType" ? (
        <ItemsGroupedList groups={groupByItemType(visibleItems)} />
      ) : (
        <ItemsList items={visibleItems} />
      )}
    </div>
  );
}
