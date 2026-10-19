"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Category = { id: string; name: string };
type ItemType = { id: string; name: string; category: Category | null };

const ALL = "__all__";

const GROUP_LABELS: Record<string, string> = {
  [ALL]: "All items",
  category: "By category",
  itemType: "By item type",
};

const SORT_LABELS: Record<string, string> = {
  [ALL]: "Newest",
  interest_desc: "Interest: high to low",
  price_desc: "Price: high to low",
  price_asc: "Price: low to high",
};

export function FilterBar({
  categories,
  itemTypes,
}: {
  categories: Category[];
  itemTypes: ItemType[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryLabels: Record<string, string> = {
    [ALL]: "All categories",
    ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
  };
  const itemTypeLabels: Record<string, string> = {
    [ALL]: "All item types",
    ...Object.fromEntries(itemTypes.map((t) => [t.id, t.name])),
  };

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  const group = searchParams.get("group") ?? ALL;
  const category = searchParams.get("category") ?? ALL;
  const itemType = searchParams.get("itemType") ?? ALL;
  const onSale = searchParams.get("onSale") === "1";
  const sort = searchParams.get("sort") ?? ALL;

  const hasActiveFilters =
    group !== ALL ||
    category !== ALL ||
    itemType !== ALL ||
    onSale ||
    sort !== ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={group}
        onValueChange={(v) => setParam("group", v as string)}
      >
        <SelectTrigger size="sm">
          <SelectValue>{(v: string) => GROUP_LABELS[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All items</SelectItem>
          <SelectItem value="category">By category</SelectItem>
          <SelectItem value="itemType">By item type</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={category}
        onValueChange={(v) => setParam("category", v as string)}
      >
        <SelectTrigger size="sm">
          <SelectValue>{(v: string) => categoryLabels[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={itemType}
        onValueChange={(v) => setParam("itemType", v as string)}
      >
        <SelectTrigger size="sm">
          <SelectValue>{(v: string) => itemTypeLabels[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All item types</SelectItem>
          {itemTypes.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(v) => setParam("sort", v as string)}>
        <SelectTrigger size="sm">
          <SelectValue>{(v: string) => SORT_LABELS[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Newest</SelectItem>
          <SelectItem value="interest_desc">Interest: high to low</SelectItem>
          <SelectItem value="price_desc">Price: high to low</SelectItem>
          <SelectItem value="price_asc">Price: low to high</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        variant={onSale ? "default" : "outline"}
        onClick={() => setParam("onSale", onSale ? null : "1")}
      >
        On sale
      </Button>

      {hasActiveFilters && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => router.push(pathname)}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
