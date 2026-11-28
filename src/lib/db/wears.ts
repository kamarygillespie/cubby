import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DbClient = SupabaseClient<Database>;

// Cost per wear (KAM-85). One row per wear, through RLS (own pieces only).

// Wears per piece, optionally only since a date (Year in Cubby).
export async function listWearCounts(
  supabase: DbClient,
  since?: string,
): Promise<Map<string, number>> {
  let query = supabase.from("item_wears").select("item_id");
  if (since) query = query.gte("worn_at", since);
  const { data, error } = await query;
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const { item_id } of data) {
    counts.set(item_id, (counts.get(item_id) ?? 0) + 1);
  }
  return counts;
}

export async function logWear(supabase: DbClient, itemId: string) {
  const { error } = await supabase
    .from("item_wears")
    .insert({ item_id: itemId });
  if (error) throw error;
}

// Removes the piece's most recent wear. False when there was none.
export async function undoWear(supabase: DbClient, itemId: string) {
  const { data, error } = await supabase
    .from("item_wears")
    .select("id")
    .eq("item_id", itemId)
    .order("worn_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  const { error: deleteError } = await supabase
    .from("item_wears")
    .delete()
    .eq("id", data.id);
  if (deleteError) throw deleteError;
  return true;
}

export async function logOutfitWear(supabase: DbClient, outfitId: string) {
  const { data, error } = await supabase.rpc("log_outfit_wear", {
    p_outfit_id: outfitId,
  });
  if (error) throw error;
  return data;
}

export async function undoOutfitWear(supabase: DbClient, outfitId: string) {
  const { data, error } = await supabase.rpc("undo_outfit_wear", {
    p_outfit_id: outfitId,
  });
  if (error) throw error;
  return data;
}
