"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addItemsToWishlists,
  createWishlist,
  deleteWishlist,
  removeItemFromWishlist,
  renameWishlist,
} from "@/lib/db/wishlists";
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
  revalidatePath("/wishlists");
  const items = `${itemIds.length} item${itemIds.length === 1 ? "" : "s"}`;
  const lists = `${wishlistIds.length} list${wishlistIds.length === 1 ? "" : "s"}`;
  return { ok: true, message: `Added ${items} to ${lists}.` };
}

export type WishlistFormState = { error: string } | null;

export async function createWishlistAction(
  _prevState: WishlistFormState,
  formData: FormData,
): Promise<WishlistFormState> {
  const parsed = parseWishlistName(String(formData.get("name") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  let id: string;
  try {
    ({ id } = await createWishlist(supabase, parsed.name));
  } catch {
    return { error: "Couldn't create the list. Try again." };
  }

  revalidatePath("/wishlists");
  redirect(`/wishlists/${id}`);
}

export async function renameWishlistAction(
  wishlistId: string,
  _prevState: WishlistFormState,
  formData: FormData,
): Promise<WishlistFormState> {
  const parsed = parseWishlistName(String(formData.get("name") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  try {
    await renameWishlist(supabase, wishlistId, parsed.name);
  } catch {
    return { error: "Couldn't rename the list. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/wishlists");
  return null;
}

export async function deleteWishlistAction(wishlistId: string) {
  const supabase = await createClient();
  await deleteWishlist(supabase, wishlistId);
  revalidatePath("/");
  revalidatePath("/wishlists");
  redirect("/wishlists");
}

export async function removeFromWishlistAction(
  wishlistId: string,
  itemId: string,
) {
  const supabase = await createClient();
  await removeItemFromWishlist(supabase, wishlistId, itemId);
  revalidatePath("/");
  revalidatePath("/wishlists");
}
