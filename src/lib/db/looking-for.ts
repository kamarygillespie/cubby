import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LookingForEntry } from "@/lib/looking-for";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Looking for" (KAM-102). Through RLS: the owner's own rows only.

const SELECT =
  "id, title, notes, budget, item_type_id, found_at, created_at, found_item:items(id, title)";

export async function listLookingFor(supabase: DbClient) {
  const { data, error } = await supabase
    .from("looking_for")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type LookingFor = Awaited<ReturnType<typeof listLookingFor>>[number];

export async function getLookingFor(supabase: DbClient, id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase
    .from("looking_for")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addLookingFor(
  supabase: DbClient,
  entry: LookingForEntry & { item_type_id?: string | null },
) {
  const { error } = await supabase.from("looking_for").insert({
    title: entry.title,
    notes: entry.notes,
    budget: entry.budget,
    item_type_id: entry.item_type_id ?? null,
  });
  if (error) throw error;
}

export async function removeLookingFor(supabase: DbClient, id: string) {
  const { error } = await supabase.from("looking_for").delete().eq("id", id);
  if (error) throw error;
}

// "Found it": the entry now points at the wishlist item it became.
export async function markLookingForFound(
  supabase: DbClient,
  id: string,
  itemId: string,
) {
  if (!UUID_RE.test(id)) return;
  const { error } = await supabase
    .from("looking_for")
    .update({ found_item_id: itemId, found_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
