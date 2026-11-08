import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// The cheapest real query: count the built-in categories (readable by
// anyone via RLS). Real database activity, which is what keeps a free-tier
// Supabase project from auto-pausing, and fails if the project is paused.
export async function pingDatabase(supabase: SupabaseClient<Database>) {
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("is_system", true)
    // A paused/unreachable project makes requests hang rather than fail.
    .abortSignal(AbortSignal.timeout(8000));
  if (error) throw error;
  return count ?? 0;
}
