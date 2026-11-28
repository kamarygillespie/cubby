import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Gift,
  Heart,
  ListChecks,
  Search,
  SearchX,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationsBell } from "@/components/notifications-bell";
import { OnboardingCard } from "@/components/onboarding-card";
import { getMonthlyBudget, getOnboardingState } from "@/lib/db/profile";
import { onboardingSteps, showOnboarding } from "@/lib/onboarding";
import {
  countUnreadNotifications,
  getNotificationSettings,
} from "@/lib/db/notifications";
import {
  listItems,
  listItemsWithFailedPriceCheck,
  listRecentPriceHighs,
} from "@/lib/db/items";
import { groupItemTypesByCategory, listItemTypes } from "@/lib/db/item-types";
import { listWishlists } from "@/lib/db/wishlists";
import { listFavoriteStores } from "@/lib/db/stores";
import { formatCurrency } from "@/lib/format";
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
  wishlistHighlight,
  type ItemView,
  type SortOption,
} from "@/lib/items-view";
import { ItemsList } from "./items-list";
import { ItemsGroupedList } from "./items-grouped-list";
import {
  ItemsNavigationProvider,
  ItemsPendingContent,
} from "./items-navigation";
import { ItemsToolbar } from "./items-toolbar";
import { ViewTabs } from "./view-tabs";
import { TotalsDashboard } from "./totals-dashboard";
import { RecapBanner } from "./recap-banner";
import { listLookingFor } from "@/lib/db/looking-for";
import { PriceCheckProvider } from "./check-price";
import { CheckInBanner } from "./check-in-banner";
import { isCheckInCandidate, showCheckInBanner } from "@/lib/cooling-off";
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
  const addItem = { href: "/items/new", label: "Add an item" };
  const state = !hasAnyItems
    ? {
        Icon: Heart,
        title: "Your cubby is empty",
        body: "Paste a link to something you love and it will live here.",
        action: { href: "/items/new", label: "Add your first item" },
      }
    : filtered
      ? {
          Icon: SearchX,
          title: "Nothing matches",
          body: "Try removing a filter to see more.",
          action: {
            href: view === "wishlist" ? "/" : `/?view=${view}`,
            label: "Clear filters",
          },
        }
      : view === "purchased"
        ? {
            Icon: ShoppingBag,
            title: "Nothing purchased yet",
            body: "The things you buy will collect here.",
          }
        : view === "gifted"
          ? {
              Icon: Gift,
              title: "No gifts yet",
              body: "Gifts will collect here once they're marked.",
            }
          : {
              Icon: Sparkles,
              title: "You got everything!",
              body: "Every item has been bought or gifted.",
              action: addItem,
            };
  const { Icon, title, body } = state;
  const action = "action" in state ? state.action : null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      <span className="bg-secondary text-brand flex size-12 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-xl">{title}</h2>
        <p>{body}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className={buttonVariants({ className: "rounded-full px-4" })}
        >
          {action.label}
        </Link>
      )}
    </div>
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
  const needsCheckOnly = firstParam(params.check) === "1";
  const hideSoldOut = firstParam(params.instock) === "1";
  const unlistedOnly = firstParam(params.unlisted) === "1";
  const sort = (firstParam(params.sort) as SortOption | undefined) ?? null;
  const group = firstParam(params.group);
  const show = parseShowCount(firstParam(params.show));
  const rawView = firstParam(params.view);
  const showTotals = rawView === "totals";
  const view =
    (showTotals ? undefined : (rawView as ItemView | undefined)) ?? "wishlist";

  const [
    items,
    itemTypes,
    wishlists,
    favoriteStores,
    unread,
    onboarding,
    failedPriceChecks,
    alertSettings,
    lookingForEntries,
  ] = await Promise.all([
    listItems(supabase),
    listItemTypes(supabase),
    listWishlists(supabase),
    listFavoriteStores(supabase),
    countUnreadNotifications(supabase),
    getOnboardingState(supabase),
    listItemsWithFailedPriceCheck(supabase),
    getNotificationSettings(supabase),
    listLookingFor(supabase),
  ]);
  // Cooling-off check-in (KAM-82).
  const now = new Date();
  const checkInCount = items.filter((item) =>
    isCheckInCandidate(item, now),
  ).length;
  const showCheckIn = showCheckInBanner({
    candidates: checkInCount,
    enabled: alertSettings.cooling_off,
    dismissedAt: onboarding.checkInDismissedAt,
    now,
  });
  const onboardingFacts = {
    ...onboarding,
    itemCount: items.length,
    wishlistCount: wishlists.length,
    favoriteStoreCount: favoriteStores.length,
  };
  const favoriteKeys = new Set(favoriteStores.map((f) => f.store_key));
  const favoritesOnly = firstParam(params.fav) === "1";
  const storeFilter = storeKey(firstParam(params.store));

  const emptyState = (
    <EmptyItems
      hasAnyItems={items.length > 0}
      view={view}
      filtered={Boolean(
        categoryId ||
        itemTypeId ||
        onSaleOnly ||
        needsCheckOnly ||
        hideSoldOut ||
        unlistedOnly ||
        favoritesOnly ||
        storeFilter,
      )}
    />
  );

  // Items on any list (KAM-103: the Not on a list filter).
  const listedIds = new Set(
    wishlists.flatMap((w) => w.wishlist_items.map((wi) => wi.item_id)),
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
      needsCheckOnly,
      needsCheck: failedPriceChecks,
      hideSoldOut,
      unlistedOnly,
      listed: listedIds,
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

  // Price checks (KAM-88, KAM-94): each shown item with a link, and its
  // store, so checks run in parallel without two at once on one store.
  const priceChecks = visibleItems.flatMap((i) => {
    if (!i.link) return [];
    try {
      return [{ id: i.id, store: new URL(i.link).hostname }];
    } catch {
      return [{ id: i.id, store: i.link }];
    }
  });

  // Each item's price paid, for list totals (KAM-103).
  const priceById = new Map(
    items.map((i) => [i.id, i.price === null ? 0 : effectivePrice(i)]),
  );
  const highlight = wishlistHighlight(items);

  const sectionLinks = [
    { href: "/wishlists", label: "Lists", Icon: ListChecks },
    { href: "/stores", label: "Stores", Icon: Store },
    { href: "/closet", label: "Closet", Icon: Shirt },
    { href: "/looking-for", label: "Looking for", Icon: Search },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-2xl leading-7 font-semibold">Cubby</h1>
          {highlight.onSaleCount > 0 ? (
            <Link
              href="/?onSale=1"
              className="text-brand truncate text-xs font-medium underline-offset-2 hover:underline"
            >
              {highlight.onSaleCount} on sale now · save{" "}
              {formatCurrency(highlight.savings)}
            </Link>
          ) : (
            highlight.count > 0 && (
              <p className="text-muted-foreground truncate text-xs">
                {highlight.count} on your wishlist
              </p>
            )
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Phones get these from the bottom tab bar (KAM-51). */}
          <nav aria-label="Sections" className="flex gap-1 max-sm:hidden">
            {sectionLinks.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <Icon />
                {label}
              </Link>
            ))}
          </nav>
          <NotificationsBell unread={unread} />
          <Link
            href="/items/new"
            className={buttonVariants({ className: "rounded-full px-4" })}
          >
            Add item
          </Link>
          <div className="max-sm:hidden">
            <AccountMenu email={user.email} />
          </div>
        </div>
      </header>
      {!showTotals && showOnboarding(onboardingFacts) && (
        <OnboardingCard steps={onboardingSteps(onboardingFacts)} />
      )}
      <div className="sm:hidden">
        <InstallPrompt variant="card" />
      </div>
      <RecapBanner />
      {showCheckIn && <CheckInBanner count={checkInCount} />}
      <ItemsNavigationProvider>
        {showTotals ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <ViewTabs />
            <ItemsPendingContent>
              <TotalsDashboard
                items={items}
                recentHighs={await listRecentPriceHighs(supabase)}
                budget={await getMonthlyBudget(supabase)}
              />
            </ItemsPendingContent>
          </div>
        ) : (
          <ItemSelectionProvider key={view}>
            <PriceCheckProvider items={priceChecks}>
              <ItemsToolbar
                filterOptions={{
                  categories,
                  itemTypes,
                  hasFavoriteStores: favoriteStores.length > 0,
                  // Wishlist items Cubby couldn't price-check (KAM-90).
                  needsCheckCount: filterByView(items, view).filter((i) =>
                    failedPriceChecks.has(i.id),
                  ).length,
                  // KAM-103: Not on a list.
                  hasLists: wishlists.length > 0,
                  unlistedCount: filterByView(items, view).filter(
                    (i) => !listedIds.has(i.id),
                  ).length,
                  // KAM-96: shows the Hide sold out toggle.
                  soldOutCount: filterByView(items, view).filter(
                    (i) => i.in_stock === false,
                  ).length,
                  storeName: storeFilter
                    ? (items.find(
                        (i) => storeKey(i.store_brand) === storeFilter,
                      )?.store_brand ?? storeFilter)
                    : null,
                }}
                showActions={view === "wishlist"}
                canSelect={shownItems.length > 0}
                // Check all prices (KAM-88): each item's store, so checks can
                // run in parallel without two at once on the same store.
                priceChecks={priceChecks}
                // Copy wishlist (KAM-91): the Wishlist tab's matching items.
                lookingFor={lookingForEntries
                  .filter((e) => !e.found_at)
                  .map((e) => ({
                    title: e.title,
                    notes: e.notes,
                    budget: e.budget,
                  }))}
                copyItems={
                  view === "wishlist"
                    ? visibleItems.map((i) => ({
                        title: i.title,
                        store: i.store_brand,
                        price: i.price,
                        salePrice: i.sale_price,
                        type: i.item_type.name,
                        category: i.item_type.category.name,
                        interest: i.interest_level,
                        link: i.link,
                        notes: i.notes,
                      }))
                    : []
                }
                filtered={Boolean(
                  categoryId ||
                  itemTypeId ||
                  onSaleOnly ||
                  needsCheckOnly ||
                  hideSoldOut ||
                  unlistedOnly ||
                  favoritesOnly ||
                  storeFilter,
                )}
              />
              {view === "wishlist" && (
                <AddToWishlistBar
                  // Select all = what's on screen.
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
                  wishlists={wishlists.map((w) => {
                    const ids = w.wishlist_items.map((wi) => wi.item_id);
                    return {
                      id: w.id,
                      name: w.name,
                      itemIds: ids,
                      // Split into lists I have (KAM-103) starts from these.
                      total: ids.reduce(
                        (sum, id) =>
                          sum + (priceById.has(id) ? priceById.get(id)! : 0),
                        0,
                      ),
                    };
                  })}
                />
              )}
              <ItemsPendingContent>
                {shownGroups ? (
                  <ItemsGroupedList
                    groups={shownGroups}
                    listsByItem={listsByItem}
                    failedPriceChecks={failedPriceChecks}
                    emptyState={emptyState}
                  />
                ) : (
                  <ItemsList
                    items={shownItems}
                    listsByItem={listsByItem}
                    failedPriceChecks={failedPriceChecks}
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
                    Show {Math.min(ITEMS_PAGE_SIZE, hiddenCount)} more (
                    {hiddenCount} not shown)
                  </Link>
                )}
              </ItemsPendingContent>
            </PriceCheckProvider>
          </ItemSelectionProvider>
        )}
      </ItemsNavigationProvider>
    </div>
  );
}
