import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";
import { ITEM_SELECT } from "./items";
import { wishlistItemPairs } from "@/lib/wishlists";

type DbClient = SupabaseClient<Database>;

export async function listWishlists(supabase: DbClient) {
  const { data, error } = await supabase
    .from("wishlists")
    .select("id, name, share_token, created_at, wishlist_items(item_id)")
    .order("name");

  if (error) throw error;
  return data;
}

export type Wishlist = Awaited<ReturnType<typeof listWishlists>>[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns null (not an error) for a malformed id, a missing list, or someone
// else's list — RLS makes the last two indistinguishable, and all should 404.
export async function getWishlist(supabase: DbClient, id: string) {
  if (!UUID_RE.test(id)) return null;

  const { data, error } = await supabase
    .from("wishlists")
    .select(
      `id, name, share_token, created_at, wishlist_items(added_at, item:items(${ITEM_SELECT}))`,
    )
    .eq("id", id)
    .order("added_at", { referencedTable: "wishlist_items", ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function renameWishlist(
  supabase: DbClient,
  id: string,
  name: string,
) {
  const { error } = await supabase
    .from("wishlists")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

// wishlist_items rows cascade; the items themselves are untouched.
export async function deleteWishlist(supabase: DbClient, id: string) {
  const { error } = await supabase.from("wishlists").delete().eq("id", id);
  if (error) throw error;
}

export async function removeItemFromWishlist(
  supabase: DbClient,
  wishlistId: string,
  itemId: string,
) {
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("wishlist_id", wishlistId)
    .eq("item_id", itemId);
  if (error) throw error;
}

export async function createWishlist(supabase: DbClient, name: string) {
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("wishlists")
    .insert({ name, user_id: userId })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

// Idempotent: pairs already on a list are left alone rather than erroring.
// RLS rejects the whole batch if any wishlist or item isn't the caller's.
export async function addItemsToWishlists(
  supabase: DbClient,
  itemIds: string[],
  wishlistIds: string[],
) {
  const rows = wishlistItemPairs(itemIds, wishlistIds);
  if (rows.length === 0) return;

  const { error } = await supabase.from("wishlist_items").upsert(rows, {
    onConflict: "wishlist_id,item_id",
    ignoreDuplicates: true,
  });

  if (error) throw error;
}
