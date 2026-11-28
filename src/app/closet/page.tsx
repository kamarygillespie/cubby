import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus, Shirt, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listClosetItems } from "@/lib/db/items";
import { listWearCounts } from "@/lib/db/wears";
import { effectivePrice } from "@/lib/items-view";
import { WEAR_SORTS, parseWearSort, sortByWear } from "@/lib/wears";
import { WearControls } from "./wear-controls";
import { closetOrigin } from "@/lib/closet";
import { cn } from "cn";

export const metadata: Metadata = { title: "Closet" };

const ORIGIN_LABEL = {
  added: "Added",
  bought: "Bought",
  gift: "Gift",
} as const;

export default async function ClosetPage({
  searchParams,
}: PageProps<"/closet">) {
  const params = await searchParams;
  const categoryId =
    typeof params.category === "string" ? params.category : null;
  // Cost per wear (KAM-85).
  const sort = parseWearSort(params.sort);
  const supabase = await createClient();
  const [items, wears] = await Promise.all([
    listClosetItems(supabase),
    listWearCounts(supabase),
  ]);
  const paid = (item: (typeof items)[number]) =>
    item.price === null ? null : effectivePrice(item);

  const categories = [
    ...new Map(
      items.map((i) => [i.item_type.category.id, i.item_type.category.name]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const shown = sortByWear(
    (categoryId
      ? items.filter((i) => i.item_type.category.id === categoryId)
      : items
    ).map((item) => ({ ...item, price: paid(item) })),
    wears,
    sort,
  );
  const href = (next: { category?: string | null; sort?: string | null }) => {
    const q = new URLSearchParams();
    const c = next.category === undefined ? categoryId : next.category;
    const s = next.sort === undefined ? sort : next.sort;
    if (c) q.set("category", c);
    if (s) q.set("sort", s);
    const qs = q.toString();
    return qs ? `/closet?${qs}` : "/closet";
  };

  const chip = (active: boolean) =>
    cn(
      buttonVariants({ size: "sm", variant: active ? "default" : "outline" }),
      "rounded-full",
    );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Closet</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} piece{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/outfits"
            className={buttonVariants({ variant: "outline" })}
          >
            <Sparkles />
            Outfits
          </Link>
          <Link href="/closet/new" className={buttonVariants()}>
            <Plus />
            Add a piece
          </Link>
        </div>
      </div>

      {categories.length > 1 && (
        <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
          <Link href={href({ category: null })} className={chip(!categoryId)}>
            All
          </Link>
          {categories.map(([id, name]) => (
            <Link
              key={id}
              href={href({ category: id })}
              className={chip(categoryId === id)}
            >
              {name}
            </Link>
          ))}
        </nav>
      )}

      {items.length > 1 && (
        <nav aria-label="Sort by wear" className="flex flex-wrap gap-2">
          {WEAR_SORTS.map((option) => (
            <Link
              key={option.value}
              href={href({ sort: sort === option.value ? null : option.value })}
              className={chip(sort === option.value)}
              aria-current={sort === option.value ? "true" : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Your closet is empty. Things you mark <strong>purchased</strong> and
          gifts you receive land here automatically, or{" "}
          <Link href="/closet/new" className="text-foreground underline">
            add pieces you already own
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5">
              <Link
                href={`/items/${item.id}/edit?from=closet`}
                className="group flex flex-col gap-1.5"
                aria-label={`${item.title}, edit or change photo`}
              >
                <div className="bg-muted relative aspect-square overflow-hidden rounded-xl">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1">
                      <Shirt className="size-8" aria-hidden />
                      <span className="text-xs">Add a photo</span>
                    </div>
                  )}
                  <span className="bg-background/85 text-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs backdrop-blur">
                    {ORIGIN_LABEL[closetOrigin(item)]}
                  </span>
                </div>
                <span className="truncate text-sm font-medium">
                  {item.title}
                </span>
                <span className="text-muted-foreground -mt-1 truncate text-xs">
                  {item.item_type.name}
                  {item.store_brand && ` · ${item.store_brand}`}
                </span>
              </Link>
              <WearControls
                itemId={item.id}
                title={item.title}
                price={item.price}
                wears={wears.get(item.id) ?? 0}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
