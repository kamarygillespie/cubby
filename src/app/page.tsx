import { redirect } from "next/navigation";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { listItems } from "@/lib/db/items";
import { listItemTypes } from "@/lib/db/item-types";
import { listWishlists } from "@/lib/db/wishlists";
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
import { TotalsDashboard } from "./totals-dashboard";
import { ItemSelectionProvider } from "./item-selection";
import { AddToWishlistBar } from "./add-to-wishlist-bar";

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
  const rawView = firstParam(params.view);
  const showTotals = rawView === "totals";
  const view =
    (showTotals ? undefined : (rawView as ItemView | undefined)) ?? "wishlist";

  const [items, itemTypes, wishlists] = await Promise.all([
    listItems(supabase),
    listItemTypes(supabase),
    listWishlists(supabase),
  ]);

  const listsByItem = new Map<string, { id: string; name: string }[]>();
  for (const list of wishlists) {
    for (const { item_id } of list.wishlist_items) {
      const lists = listsByItem.get(item_id) ?? [];
      lists.push({ id: list.id, name: list.name });
      listsByItem.set(item_id, lists);
    }
  }

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
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        {/* min-w-0 + wrap-anywhere: a long email must wrap, not widen the
            page into horizontal scroll on phones. */}
        <p className="text-muted-foreground min-w-0 text-sm wrap-anywhere">
          Signed in as {user.email}
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewTabs />
        <Link
          href="/wishlists"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ListChecks />
          Lists
        </Link>
      </div>
      {showTotals ? (
        <TotalsDashboard items={items} />
      ) : (
        <ItemSelectionProvider key={view}>
          <FilterBar categories={categories} itemTypes={itemTypes} />
          {view === "wishlist" && (
            <AddToWishlistBar
              itemIds={visibleItems.map((i) => i.id)}
              wishlists={wishlists.map((w) => ({
                id: w.id,
                name: w.name,
                itemIds: w.wishlist_items.map((wi) => wi.item_id),
              }))}
            />
          )}
          {group === "category" ? (
            <ItemsGroupedList
              groups={groupByCategory(visibleItems)}
              listsByItem={listsByItem}
            />
          ) : group === "itemType" ? (
            <ItemsGroupedList
              groups={groupByItemType(visibleItems)}
              listsByItem={listsByItem}
            />
          ) : (
            <ItemsList items={visibleItems} listsByItem={listsByItem} />
          )}
        </ItemSelectionProvider>
      )}
    </div>
  );
}
