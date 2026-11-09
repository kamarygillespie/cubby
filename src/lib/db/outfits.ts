import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PIECE_SELECT =
  "item:items(id, title, image_url, store_brand, item_type:item_types(name))";

export async function listOutfits(supabase: DbClient) {
  const { data, error } = await supabase
    .from("outfits")
    .select(`id, name, photo_url, created_at, outfit_items(${PIECE_SELECT})`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Null for a malformed id, a missing outfit, or someone else's (RLS).
export async function getOutfit(supabase: DbClient, id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase
    .from("outfits")
    .select(`id, name, photo_url, created_at, outfit_items(${PIECE_SELECT})`)
    .eq("id", id)
    .order("added_at", { referencedTable: "outfit_items" })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Outfit = NonNullable<Awaited<ReturnType<typeof getOutfit>>>;

// Names of the outfits a closet piece is part of (shown on its edit page).
export async function listOutfitsForItem(supabase: DbClient, itemId: string) {
  const { data, error } = await supabase
    .from("outfit_items")
    .select("outfit:outfits(id, name)")
    .eq("item_id", itemId);
  if (error) throw error;
  return data.flatMap((row) => (row.outfit ? [row.outfit] : []));
}

export async function createOutfit(
  supabase: DbClient,
  input: { name: string; photoUrl: string | null; itemIds: string[] },
) {
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("outfits")
    .insert({ user_id: userId, name: input.name, photo_url: input.photoUrl })
    .select("id")
    .single();
  if (error) throw error;
  try {
    await setOutfitPieces(supabase, data.id, input.itemIds);
  } catch (piecesError) {
    // Don't leave an empty outfit behind if its pieces were refused.
    await supabase.from("outfits").delete().eq("id", data.id);
    throw piecesError;
  }
  return data;
}

export async function updateOutfit(
  supabase: DbClient,
  id: string,
  input: { name: string; photoUrl: string | null },
) {
  const { error } = await supabase
    .from("outfits")
    .update({
      name: input.name,
      photo_url: input.photoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

// Replaces the outfit's pieces with exactly `itemIds`. RLS requires both the
// outfit and every item to be the caller's.
export async function setOutfitPieces(
  supabase: DbClient,
  outfitId: string,
  itemIds: string[],
) {
  const unique = [...new Set(itemIds)];
  const { error: deleteError } = await supabase
    .from("outfit_items")
    .delete()
    .eq("outfit_id", outfitId)
    .not(
      "item_id",
      "in",
      `(${unique.length ? unique.join(",") : "00000000-0000-0000-0000-000000000000"})`,
    );
  if (deleteError) throw deleteError;
  if (unique.length === 0) return;
  const { error } = await supabase.from("outfit_items").upsert(
    unique.map((item_id) => ({ outfit_id: outfitId, item_id })),
    { onConflict: "outfit_id,item_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function deleteOutfit(supabase: DbClient, id: string) {
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) throw error;
}
