"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addItemsToWishlists, createWishlist } from "@/lib/db/wishlists";
import { parseWishlistName } from "@/lib/wishlists";

export type AddToWishlistsResult =
  { ok: true; message: string } | { ok: false; error: string };

export async function addToWishlists(input: {
  itemIds: string[];
  wishlistIds: string[];
  newWishlistName: string;
}): Promise<AddToWishlistsResult> {
  const { itemIds, newWishlistName } = input;
  const wishlistIds = [...input.wishlistIds];

  if (itemIds.length === 0) {
    return { ok: false, error: "Select at least one item." };
  }

  const wantsNewList = newWishlistName.trim() !== "";
  const parsedName = wantsNewList ? parseWishlistName(newWishlistName) : null;
  if (parsedName && !parsedName.ok) {
    return { ok: false, error: parsedName.error };
  }
  if (wishlistIds.length === 0 && !parsedName) {
    return { ok: false, error: "Pick a list or create a new one." };
  }

  const supabase = await createClient();
  try {
    if (parsedName?.ok) {
      const created = await createWishlist(supabase, parsedName.name);
      wishlistIds.push(created.id);
    }
    // RLS rejects the batch if any id isn't the caller's own.
    await addItemsToWishlists(supabase, itemIds, wishlistIds);
  } catch {
    return { ok: false, error: "Couldn't add to the list. Try again." };
  }

  revalidatePath("/");
  const items = `${itemIds.length} item${itemIds.length === 1 ? "" : "s"}`;
  const lists = `${wishlistIds.length} list${wishlistIds.length === 1 ? "" : "s"}`;
  return { ok: true, message: `Added ${items} to ${lists}.` };
}
