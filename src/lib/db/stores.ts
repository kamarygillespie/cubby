import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";
import { storeKey } from "@/lib/stores";

type DbClient = SupabaseClient<Database>;

export async function listFavoriteStores(supabase: DbClient) {
  const { data, error } = await supabase
    .from("favorite_stores")
    .select("store_key, display_name, sale_url")
    .order("display_name");
  if (error) throw error;
  return data;
}

// Star / unstar a store by its name as it appears on items.
export async function setFavoriteStore(
  supabase: DbClient,
  storeName: string,
  favorite: boolean,
) {
  const key = storeKey(storeName);
  if (!key) throw new Error("Store name is empty");
  if (!favorite) {
    const { error } = await supabase
      .from("favorite_stores")
      .delete()
      .eq("store_key", key);
    if (error) throw error;
    return;
  }
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("favorite_stores")
    .upsert(
      { user_id: userId, store_key: key, display_name: storeName.trim() },
      { onConflict: "user_id,store_key", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function setStoreSaleUrl(
  supabase: DbClient,
  key: string,
  saleUrl: string | null,
) {
  const { error } = await supabase
    .from("favorite_stores")
    .update({ sale_url: saleUrl })
    .eq("store_key", key);
  if (error) throw error;
}
