import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DbClient = SupabaseClient<Database>;

export async function listItemTypes(supabase: DbClient) {
  const { data, error } = await supabase
    .from("item_types")
    .select("id, name, category:categories(id, name)")
    .order("name");

  if (error) throw error;
  return data;
}
