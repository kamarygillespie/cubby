import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getOutfit } from "@/lib/db/outfits";
import { OutfitForm } from "../../outfit-form";
import { updateOutfitAction } from "../../actions";
import { closetPieces } from "../../pieces";
import { DeleteOutfitButton } from "./delete-outfit-button";

export const metadata: Metadata = { title: "Edit outfit" };

export default async function EditOutfitPage({
  params,
}: PageProps<"/outfits/[id]/edit">) {
  const supabase = await createClient();
  const outfit = await getOutfit(supabase, (await params).id);
  if (!outfit) notFound();
  const pieces = await closetPieces(supabase);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4">
      <Link
        href={`/outfits/${outfit.id}`}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        {outfit.name}
      </Link>
      <h1 className="text-xl font-semibold">Edit outfit</h1>
      <OutfitForm
        action={updateOutfitAction.bind(null, outfit.id)}
        pieces={pieces}
        initial={{
          name: outfit.name,
          photo_url: outfit.photo_url,
          pieceIds: outfit.outfit_items.flatMap((p) =>
            p.item ? [p.item.id] : [],
          ),
        }}
        submitLabel="Save changes"
      />
      <div className="border-t pt-4">
        <DeleteOutfitButton outfitId={outfit.id} name={outfit.name} />
      </div>
    </div>
  );
}
