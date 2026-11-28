import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseListExtras, parseSizes, type Sizes } from "@/lib/sizes";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The owner's sizes (KAM-78), through RLS (own profile only).
export async function getSizes(supabase: DbClient): Promise<Sizes> {
  const { data, error } = await supabase
    .from("profiles")
    .select("sizes")
    .maybeSingle();
  if (error) throw error;
  return parseSizes(data?.sizes);
}

export async function saveSizes(supabase: DbClient, sizes: Sizes) {
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("profiles")
    .update({ sizes: parseSizes(sizes) })
    .eq("id", userId);
  if (error) throw error;
}

export async function setWishlistShowSizes(
  supabase: DbClient,
  wishlistId: string,
  show: boolean,
) {
  const { error } = await supabase
    .from("wishlists")
    .update({ show_sizes: show })
    .eq("id", wishlistId);
  if (error) throw error;
}

// Public share page (KAM-78, KAM-80): sizes plus per-item type, category and
// "most wanted". Token-gated SECURITY DEFINER function, the same sanctioned
// RLS bypass as getSharedWishlist() (ARCHITECTURE.md, "Public Wishlist
// Sharing").
export async function getSharedListExtras(supabase: DbClient, token: string) {
  if (!UUID_RE.test(token)) return parseListExtras(null);
  const { data, error } = await supabase.rpc("get_shared_list_extras", {
    token,
  });
  if (error) throw error;
  return parseListExtras(data);
}
