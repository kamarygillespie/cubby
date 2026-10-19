import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DbClient = SupabaseClient<Database>;

export type NewItem = Database["public"]["Tables"]["items"]["Insert"];
export type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];

const ITEM_SELECT =
  "*, item_type:item_types(id, name, category:categories(id, name))";

async function requireUserId(supabase: DbClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function listItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getItem(supabase: DbClient, id: string) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("id", id)
    .single();

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
