import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";
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
