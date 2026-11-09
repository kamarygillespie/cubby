import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { OutfitForm } from "../outfit-form";
import { createOutfitAction } from "../actions";
import { closetPieces } from "../pieces";

export const metadata: Metadata = { title: "New outfit" };

export default async function NewOutfitPage() {
  const pieces = await closetPieces(await createClient());
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4">
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
      <h1 className="text-xl font-semibold">New outfit</h1>
      <OutfitForm
        action={createOutfitAction}
        pieces={pieces}
        submitLabel="Save outfit"
      />
    </div>
  );
}
