import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus, Shirt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listClosetItems } from "@/lib/db/items";
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
  const category = (await searchParams).category;
  const categoryId = typeof category === "string" ? category : null;
  const items = await listClosetItems(await createClient());

  const categories = [
    ...new Map(
      items.map((i) => [i.item_type.category.id, i.item_type.category.name]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const shown = categoryId
    ? items.filter((i) => i.item_type.category.id === categoryId)
    : items;

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
        <Link href="/closet/new" className={buttonVariants()}>
          <Plus />
          Add a piece
        </Link>
      </div>

      {categories.length > 1 && (
        <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
          <Link href="/closet" className={chip(!categoryId)}>
            All
          </Link>
          {categories.map(([id, name]) => (
            <Link
              key={id}
              href={`/closet?category=${id}`}
              className={chip(categoryId === id)}
            >
              {name}
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
            <li key={item.id}>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
