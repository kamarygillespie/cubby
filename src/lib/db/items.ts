import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

// `discount_percent` is a generated column (Postgres rejects writes to it
// outright) and `purchased_date` is trigger-managed — synced from the
// `purchased` flag, see DATABASE.md — so the app must never set it directly
// or it can drift out of sync with `purchased` on an unrelated update.
type RawNewItem = Database["public"]["Tables"]["items"]["Insert"];
type RawItemUpdate = Database["public"]["Tables"]["items"]["Update"];
type AppReadonlyField = "discount_percent" | "purchased_date";

export type NewItem = Omit<RawNewItem, AppReadonlyField>;
export type ItemUpdate = Omit<RawItemUpdate, AppReadonlyField>;

export const ITEM_SELECT =
  "*, item_type:item_types(id, name, category:categories(id, name))";

export async function listItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export type Item = Awaited<ReturnType<typeof listItems>>[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Null (not an error) for a malformed id, a missing item, or someone else's
// item — RLS makes the last two indistinguishable, and all should 404.
export async function getItem(supabase: DbClient, id: string) {
  if (!UUID_RE.test(id)) return null;

  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createItem(
  supabase: DbClient,
  input: Omit<NewItem, "user_id">,
) {
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("items")
    .insert({ ...input, user_id: userId })
    .select(ITEM_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateItem(
  supabase: DbClient,
  id: string,
  input: ItemUpdate,
) {
  const { data, error } = await supabase
    .from("items")
    .update(input)
    .eq("id", id)
    .select(ITEM_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItem(supabase: DbClient, id: string) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}
