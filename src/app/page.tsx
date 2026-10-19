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

// What to say when the current tab/filters show nothing — "No items yet"
// is wrong when the user has items that are just filtered out or elsewhere.
function EmptyItems({
  hasAnyItems,
  view,
  filtered,
}: {
  hasAnyItems: boolean;
  view: ItemView;
  filtered: boolean;
}) {
  if (!hasAnyItems) {
    return (
      <p>
        No items yet.{" "}
        <Link href="/items/new" className="text-foreground underline">
          Add your first one
        </Link>{" "}
        — type it in or paste a product link.
      </p>
    );
  }
  if (filtered) {
    return (
      <p>
        No items match these filters.{" "}
        <Link
          href={view === "wishlist" ? "/" : `/?view=${view}`}
          className="text-foreground underline"
        >
          Clear filters
        </Link>
      </p>
    );
  }
  if (view === "purchased") return <p>Nothing marked purchased yet.</p>;
  if (view === "gifted") return <p>Nothing marked gifted yet.</p>;
  return (
    <p>
      Your wishlist is empty — everything&apos;s been bought or gifted.{" "}
      <Link href="/items/new" className="text-foreground underline">
        Add an item
      </Link>
    </p>
  );
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

  const emptyState = (
    <EmptyItems
      hasAnyItems={items.length > 0}
      view={view}
      filtered={Boolean(categoryId || itemTypeId || onSaleOnly)}
    />
  );

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
      <div className="flex items-center justify-between gap-2 max-sm:justify-end">
        {/* Hidden on phones, where the header is tight and Log out already
            says you're signed in. min-w-0 + wrap-anywhere: a long email
            must wrap, not widen the page into horizontal scroll. */}
        <p className="text-muted-foreground min-w-0 text-sm wrap-anywhere max-sm:hidden">
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
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            // Slightly tighter on phones so this fits beside the tabs.
            className: "max-sm:px-2",
          })}
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
              emptyState={emptyState}
            />
          ) : group === "itemType" ? (
            <ItemsGroupedList
              groups={groupByItemType(visibleItems)}
              listsByItem={listsByItem}
              emptyState={emptyState}
            />
          ) : (
            <ItemsList
              items={visibleItems}
              listsByItem={listsByItem}
              emptyState={emptyState}
            />
          )}
        </ItemSelectionProvider>
      )}
    </div>
  );
}
