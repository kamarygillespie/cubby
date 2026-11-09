import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Shirt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getOutfit } from "@/lib/db/outfits";

const loadOutfit = cache(async (id: string) =>
  getOutfit(await createClient(), id),
);

export async function generateMetadata({
  params,
}: PageProps<"/outfits/[id]">): Promise<Metadata> {
  const outfit = await loadOutfit((await params).id);
  return { title: outfit?.name ?? "Outfit not found" };
}

// The outfit board: its photo (if any) and its pieces laid out together.
export default async function OutfitPage({
  params,
}: PageProps<"/outfits/[id]">) {
  const outfit = await loadOutfit((await params).id);
  if (!outfit) notFound();
  const pieces = outfit.outfit_items.flatMap((p) => (p.item ? [p.item] : []));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <Link
        href="/outfits"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        Outfits
      </Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{outfit.name}</h1>
        <Link
          href={`/outfits/${outfit.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil />
          Edit
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {outfit.photo_url && (
          <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden rounded-xl sm:w-64 sm:shrink-0">
            <Image
              src={outfit.photo_url}
              alt={`${outfit.name} outfit photo`}
              fill
              sizes="(min-width: 640px) 256px, 100vw"
              className="object-cover"
            />
          </div>
        )}
        {pieces.length > 0 ? (
          <ul className="grid flex-1 grid-cols-2 gap-3 self-start sm:grid-cols-3">
            {pieces.map((piece) => (
              <li key={piece.id}>
                <Link
                  href={`/items/${piece.id}/edit?from=closet`}
                  className="flex flex-col gap-1"
                >
                  <span className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                    {piece.image_url ? (
                      <Image
                        src={piece.image_url}
                        alt=""
                        fill
                        sizes="33vw"
                        className="object-cover"
                      />
                    ) : (
                      <Shirt
                        className="text-muted-foreground absolute inset-0 m-auto size-7"
                        aria-hidden
                      />
                    )}
                  </span>
                  <span className="truncate text-sm">{piece.title}</span>
                  <span className="text-muted-foreground -mt-1 truncate text-xs">
                    {piece.item_type?.name}
                    {piece.store_brand && ` · ${piece.store_brand}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No pieces tagged.{" "}
            <Link
              href={`/outfits/${outfit.id}/edit`}
              className="text-foreground underline"
            >
              Add pieces from your closet
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
