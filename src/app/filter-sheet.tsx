"use client";

import { useOptimistic, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useItemsNavigation } from "./items-navigation";

type Category = { id: string; name: string };
type ItemType = { id: string; name: string; category: Category | null };

export type FilterOptions = {
  categories: Category[];
  itemTypes: ItemType[];
  // Show the "Favorite stores" toggle only once some are starred.
  hasFavoriteStores?: boolean;
  // Display name for an active ?store= filter (from the Stores page).
  storeName?: string | null;
  // Items whose latest price check couldn't read the page (KAM-90). The
  // toggle shows only when there are some, or while it's on.
  needsCheckCount?: number;
};

const ALL = "__all__";

const GROUP_OPTIONS = [
  { value: ALL, label: "All items" },
  { value: "category", label: "By category" },
  { value: "itemType", label: "By item type" },
];

const SORT_OPTIONS = [
  { value: ALL, label: "Newest" },
  { value: "interest_desc", label: "Interest: high to low" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "price_asc", label: "Price: low to high" },
];

const labelFor = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

// The filters live in the URL, so they survive refreshes and the back button.
function useItemFilters({
  categories,
  itemTypes,
  storeName = null,
}: FilterOptions) {
  const { navigate } = useItemsNavigation();
  const pathname = usePathname();
  const urlParams = useSearchParams().toString();
  // Controls show the new choice right away, before the items have loaded.
  const [currentParams, setCurrentParams] = useOptimistic(urlParams);
  const searchParams = new URLSearchParams(currentParams);

  function go(params: URLSearchParams) {
    const query = params.toString();
    navigate(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
      onStart: () => setCurrentParams(query),
    });
  }

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === ALL) params.delete(key);
    else params.set(key, value);
    go(params);
  }

  // Clears the filters but stays on the current tab.
  function clearAll() {
    const params = new URLSearchParams();
    const view = searchParams.get("view");
    if (view) params.set("view", view);
    go(params);
  }

  const group = searchParams.get("group") ?? ALL;
  const category = searchParams.get("category") ?? ALL;
  const itemType = searchParams.get("itemType") ?? ALL;
  const sort = searchParams.get("sort") ?? ALL;
  const onSale = searchParams.get("onSale") === "1";
  const needsCheck = searchParams.get("check") === "1";
  const favoritesOnly = searchParams.get("fav") === "1";
  const store = searchParams.get("store");

  const active: { key: string; label: string; removeLabel?: string }[] = [
    ...(store
      ? [
          {
            key: "store",
            label: storeName ?? store,
            removeLabel: `Showing ${storeName ?? store} only. Remove store filter`,
          },
        ]
      : []),
    ...(category !== ALL
      ? [
          {
            key: "category",
            label:
              categories.find((c) => c.id === category)?.name ?? "Category",
          },
        ]
      : []),
    ...(itemType !== ALL
      ? [
          {
            key: "itemType",
            label:
              itemTypes.find((t) => t.id === itemType)?.name ?? "Item type",
          },
        ]
      : []),
    ...(onSale ? [{ key: "onSale", label: "On sale" }] : []),
    ...(needsCheck ? [{ key: "check", label: "Needs a manual check" }] : []),
    ...(favoritesOnly ? [{ key: "fav", label: "Favorite stores" }] : []),
    ...(group !== ALL
      ? [{ key: "group", label: labelFor(GROUP_OPTIONS, group) }]
      : []),
    ...(sort !== ALL
      ? [{ key: "sort", label: labelFor(SORT_OPTIONS, sort) }]
      : []),
  ];

  return {
    group,
    category,
    itemType,
    sort,
    onSale,
    needsCheck,
    favoritesOnly,
    active,
    setParam,
    clearAll,
  };
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={pressed ? "default" : "outline"}
      aria-pressed={pressed}
      className="h-8 rounded-full px-3"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

// One Filter button that holds every sort, filter and grouping (KAM-61).
export function FilterSheet(options: FilterOptions) {
  const {
    categories,
    itemTypes,
    hasFavoriteStores = false,
    needsCheckCount = 0,
  } = options;
  const [open, setOpen] = useState(false);
  const filters = useItemFilters(options);
  const count = filters.active.length;

  const itemTypeLabels: Record<string, string> = {
    [ALL]: "All item types",
    ...Object.fromEntries(itemTypes.map((t) => [t.id, t.name])),
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={count > 0 ? "secondary" : "ghost"}
        className="max-sm:px-2"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal />
        <span className="max-sm:sr-only">Filter</span>
        {count > 0 && <span className="tabular-nums">{count}</span>}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle>Filter and sort</SheetTitle>

          <Section title="Sort by">
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                pressed={filters.sort === option.value}
                onClick={() => filters.setParam("sort", option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </Section>

          <Section title="Show">
            <Chip
              pressed={filters.onSale}
              onClick={() =>
                filters.setParam("onSale", filters.onSale ? null : "1")
              }
            >
              On sale
            </Chip>
            {(needsCheckCount > 0 || filters.needsCheck) && (
              <Chip
                pressed={filters.needsCheck}
                onClick={() =>
                  filters.setParam("check", filters.needsCheck ? null : "1")
                }
              >
                Needs a manual check ({needsCheckCount})
              </Chip>
            )}
            {hasFavoriteStores && (
              <Chip
                pressed={filters.favoritesOnly}
                onClick={() =>
                  filters.setParam("fav", filters.favoritesOnly ? null : "1")
                }
              >
                Favorite stores
              </Chip>
            )}
          </Section>

          <Section title="Category">
            <Chip
              pressed={filters.category === ALL}
              onClick={() => filters.setParam("category", ALL)}
            >
              All
            </Chip>
            {categories.map((category) => (
              <Chip
                key={category.id}
                pressed={filters.category === category.id}
                onClick={() => filters.setParam("category", category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </Section>

          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-item-type">Item type</Label>
            <Select
              value={filters.itemType}
              onValueChange={(value) =>
                filters.setParam("itemType", value as string)
              }
            >
              <SelectTrigger id="filter-item-type" className="w-full">
                <SelectValue>
                  {(value: string) => itemTypeLabels[value]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All item types</SelectItem>
                {itemTypes.map((itemType) => (
                  <SelectItem key={itemType.id} value={itemType.id}>
                    {itemType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Section title="Group">
            {GROUP_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                pressed={filters.group === option.value}
                onClick={() => filters.setParam("group", option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </Section>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1"
              disabled={count === 0}
              onClick={filters.clearAll}
            >
              Clear all
            </Button>
            <Button
              type="button"
              className="h-10 flex-1"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// What's currently applied, each removable with one tap.
export function ActiveFilters(options: FilterOptions) {
  const filters = useItemFilters(options);
  if (filters.active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.active.map((filter) => (
        <Button
          key={filter.key}
          type="button"
          size="xs"
          variant="secondary"
          className="rounded-full"
          aria-label={filter.removeLabel ?? `Remove ${filter.label} filter`}
          onClick={() => filters.setParam(filter.key, null)}
        >
          {filter.label}
          <X />
        </Button>
      ))}
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={filters.clearAll}
      >
        Clear
      </Button>
    </div>
  );
}
