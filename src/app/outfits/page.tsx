import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus, Shirt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listOutfits } from "@/lib/db/outfits";

export const metadata: Metadata = { title: "Outfits" };

// Cover: the outfit photo, else a 2×2 collage of its first pieces.
function Cover({
  photoUrl,
  pieces,
}: {
  photoUrl: string | null;
  pieces: { id: string; image_url: string | null }[];
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt=""
        fill
        sizes="(min-width: 640px) 33vw, 50vw"
        className="object-cover"
      />
    );
  }
  const tiles = pieces.slice(0, 4);
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
      {Array.from({ length: 4 }, (_, i) => tiles[i]).map((piece, i) => (
        <div key={piece?.id ?? i} className="bg-muted relative">
          {piece?.image_url ? (
            <Image
              src={piece.image_url}
              alt=""
              fill
              sizes="25vw"
              className="object-cover"
            />
          ) : piece ? (
            <Shirt
              className="text-muted-foreground absolute inset-0 m-auto size-5"
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function OutfitsPage() {
  const outfits = await listOutfits(await createClient());

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <Link
        href="/closet"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        Closet
      </Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Outfits</h1>
        <Link href="/outfits/new" className={buttonVariants()}>
          <Plus />
          New outfit
        </Link>
      </div>

      {outfits.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No outfits yet. Put together pieces from your closet, or save a photo
          of a look you love.{" "}
          <Link href="/outfits/new" className="text-foreground underline">
            Make your first outfit
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {outfits.map((outfit) => {
            const pieces = outfit.outfit_items.flatMap((p) =>
              p.item ? [p.item] : [],
            );
            return (
              <li key={outfit.id}>
                <Link
                  href={`/outfits/${outfit.id}`}
                  className="group flex flex-col gap-1.5"
                >
                  <div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-xl">
                    <Cover photoUrl={outfit.photo_url} pieces={pieces} />
                  </div>
                  <span className="truncate text-sm font-medium">
                    {outfit.name}
                  </span>
                  <span className="text-muted-foreground -mt-1 text-xs">
                    {pieces.length} piece{pieces.length === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
