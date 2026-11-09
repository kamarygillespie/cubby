"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listClosetItems } from "@/lib/db/items";
import { deleteItemImage, uploadItemImage } from "@/lib/db/item-images";
import {
  createOutfit,
  deleteOutfit,
  getOutfit,
  setOutfitPieces,
  updateOutfit,
} from "@/lib/db/outfits";
import { parseWishlistName } from "@/lib/wishlists";

export type OutfitFormState = { error: string } | null;

function chosenFile(formData: FormData): File | null {
  const file = formData.get("photo");
  return file instanceof File && file.size > 0 ? file : null;
}

// Outfit names follow the same rules as list names (1–60 chars).
function parseName(formData: FormData) {
  return parseWishlistName(String(formData.get("name") ?? ""));
}

// Only closet pieces can be in an outfit; anything else is dropped.
async function closetPieceIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
) {
  const wanted = new Set(formData.getAll("piece").map(String));
  if (wanted.size === 0) return [];
  const closet = await listClosetItems(supabase);
  return closet.filter((item) => wanted.has(item.id)).map((item) => item.id);
}

function revalidateOutfitViews() {
  revalidatePath("/outfits", "layout");
  revalidatePath("/closet");
}

export async function createOutfitAction(
  _prev: OutfitFormState,
  formData: FormData,
): Promise<OutfitFormState> {
  const name = parseName(formData);
  if (!name.ok) return { error: name.error };

  const supabase = await createClient();
  let id: string;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const pieces = await closetPieceIds(supabase, formData);
    const file = chosenFile(formData);
    if (pieces.length === 0 && !file) {
      return { error: "Pick some pieces or add a photo." };
    }
    const photoUrl = file
      ? await uploadItemImage(supabase, user.id, file)
      : null;
    ({ id } = await createOutfit(supabase, {
      name: name.name,
      photoUrl,
      itemIds: pieces,
    }));
  } catch {
    return { error: "Couldn't save the outfit. Try again." };
  }

  revalidateOutfitViews();
  redirect(`/outfits/${id}`);
}

export async function updateOutfitAction(
  outfitId: string,
  _prev: OutfitFormState,
  formData: FormData,
): Promise<OutfitFormState> {
  const name = parseName(formData);
  if (!name.ok) return { error: name.error };

  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const existing = await getOutfit(supabase, outfitId);
    if (!existing) return { error: "This outfit no longer exists." };

    const file = chosenFile(formData);
    const removing = formData.get("remove_photo") === "1";
    const photoUrl = file
      ? await uploadItemImage(supabase, user.id, file)
      : removing
        ? null
        : existing.photo_url;

    const pieces = await closetPieceIds(supabase, formData);
    if (pieces.length === 0 && !photoUrl) {
      return { error: "An outfit needs some pieces or a photo." };
    }
    await updateOutfit(supabase, outfitId, { name: name.name, photoUrl });
    await setOutfitPieces(supabase, outfitId, pieces);
    if (photoUrl !== existing.photo_url) {
      await deleteItemImage(supabase, existing.photo_url);
    }
  } catch {
    return { error: "Couldn't save the outfit. Try again." };
  }

  revalidateOutfitViews();
  redirect(`/outfits/${outfitId}`);
}

export async function deleteOutfitAction(outfitId: string) {
  const supabase = await createClient();
  const existing = await getOutfit(supabase, outfitId);
  if (existing) {
    await deleteOutfit(supabase, outfitId);
    await deleteItemImage(supabase, existing.photo_url);
  }
  revalidateOutfitViews();
  redirect("/outfits");
}
