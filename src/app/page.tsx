import { redirect } from "next/navigation";
import Link from "next/link";
import { ListChecks, Shirt, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationsBell } from "@/components/notifications-bell";
import { countUnreadNotifications } from "@/lib/db/notifications";
import { listItems, listRecentPriceHighs } from "@/lib/db/items";
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { listWishlists } from "@/lib/db/wishlists";
import { listFavoriteStores } from "@/lib/db/stores";
import { storeKey } from "@/lib/stores";
import {
  ITEMS_PAGE_SIZE,
  effectivePrice,
  filterByView,
  filterItems,
  groupByCategory,
  groupByItemType,
  limitGroups,
  parseShowCount,
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
import { CheckAllPricesButton } from "./check-price";

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
  const show = parseShowCount(firstParam(params.show));
  const rawView = firstParam(params.view);
  const showTotals = rawView === "totals";
  const view =
    (showTotals ? undefined : (rawView as ItemView | undefined)) ?? "wishlist";

  const [items, itemTypes, wishlists, favoriteStores, unread] =
    await Promise.all([
      listItems(supabase),
      listItemTypes(supabase),
      listWishlists(supabase),
      listFavoriteStores(supabase),
      countUnreadNotifications(supabase),
    ]);
  const favoriteKeys = new Set(favoriteStores.map((f) => f.store_key));
  const favoritesOnly = firstParam(params.fav) === "1";
  const storeFilter = storeKey(firstParam(params.store));

  const emptyState = (
    <EmptyItems
      hasAnyItems={items.length > 0}
      view={view}
      filtered={Boolean(
        categoryId || itemTypeId || onSaleOnly || favoritesOnly || storeFilter,
      )}
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
    }).filter((item) => {
      // Store filters (KAM-49): ?store=<key> from the Stores page, and the
      // "Favorite stores" toggle.
      const key = storeKey(item.store_brand);
      if (storeFilter && key !== storeFilter) return false;
      if (favoritesOnly && !(key && favoriteKeys.has(key))) return false;
      return true;
    }),
    sort,
  );

  // Cap the rendered cards (KAM-45); counts, group totals, filters and
  // Check all prices still use every matching item.
  const allGroups =
    group === "category"
      ? groupByCategory(visibleItems)
      : group === "itemType"
        ? groupByItemType(visibleItems)
        : null;
  const limited = allGroups ? limitGroups(allGroups, show) : null;
  const shownGroups = limited?.groups ?? null;
  const shownItems = shownGroups
    ? shownGroups.flatMap((g) => g.items)
    : visibleItems.slice(0, show);
  const hiddenCount = visibleItems.length - shownItems.length;
  const showMoreParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      key === "show" || value === undefined
        ? []
        : [[key, Array.isArray(value) ? value[0] : value] as [string, string]],
    ),
  );
  showMoreParams.set("show", String(show + ITEMS_PAGE_SIZE));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        {/* Phones: the app title; theme, log out and section links live in
            the bottom tab bar's More (KAM-51). min-w-0 + wrap-anywhere: a
            long email must wrap, not widen the page into horizontal scroll. */}
        <h1 className="text-lg font-semibold sm:hidden">Cubby</h1>
        <p className="text-muted-foreground min-w-0 text-sm wrap-anywhere max-sm:hidden">
          Signed in as {user.email}
        </p>
        <div className="flex items-center gap-2">
          <NotificationsBell unread={unread} />
          <div className="max-sm:hidden">
            <ThemeToggle />
          </div>
          <Link
            href="/items/new"
            className={buttonVariants({ variant: "default" })}
          >
            Add item
          </Link>
          <form action={signOut} className="max-sm:hidden">
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </div>
      <div className="sm:hidden">
        <InstallPrompt variant="card" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewTabs />
        <div className="flex gap-1 max-sm:hidden">
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
          <Link
            href="/stores"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "max-sm:px-2",
            })}
          >
            <Store />
            Stores
          </Link>
          <Link
            href="/closet"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "max-sm:px-2",
            })}
          >
            <Shirt />
            Closet
          </Link>
        </div>
      </div>
      {showTotals ? (
        <TotalsDashboard
          items={items}
          recentHighs={await listRecentPriceHighs(supabase)}
        />
      ) : (
        <ItemSelectionProvider key={view}>
          <FilterBar
            categories={categories}
            itemTypes={itemTypes}
            hasFavoriteStores={favoriteStores.length > 0}
            storeName={
              storeFilter
                ? (items.find((i) => storeKey(i.store_brand) === storeFilter)
                    ?.store_brand ?? storeFilter)
                : null
            }
          />
          {view === "wishlist" && (
            <AddToWishlistBar
              extraActions={
                <CheckAllPricesButton
                  itemIds={visibleItems.filter((i) => i.link).map((i) => i.id)}
                />
              }
              // Select all = what's on screen; Check all prices = every match.
              itemIds={shownItems.map((i) => i.id)}
              itemTypeGroups={groupItemTypesByCategory(itemTypes)}
              itemInfo={Object.fromEntries(
                shownItems.map((i) => [
                  i.id,
                  {
                    title: i.title,
                    price: i.price === null ? null : effectivePrice(i),
                  },
                ]),
              )}
              wishlists={wishlists.map((w) => ({
                id: w.id,
                name: w.name,
                itemIds: w.wishlist_items.map((wi) => wi.item_id),
              }))}
            />
          )}
          {shownGroups ? (
            <ItemsGroupedList
              groups={shownGroups}
              listsByItem={listsByItem}
              emptyState={emptyState}
            />
          ) : (
            <ItemsList
              items={shownItems}
              listsByItem={listsByItem}
              emptyState={emptyState}
            />
          )}
          {hiddenCount > 0 && (
            <Link
              href={`/?${showMoreParams.toString()}`}
              scroll={false}
              className={buttonVariants({
                variant: "outline",
                className: "self-center",
              })}
            >
              Show {Math.min(ITEMS_PAGE_SIZE, hiddenCount)} more ({hiddenCount}{" "}
              not shown)
            </Link>
          )}
        </ItemSelectionProvider>
      )}
    </div>
  );
}
