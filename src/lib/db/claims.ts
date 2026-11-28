import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  parseSharedClaims,
  toClaimOutcome,
  type ClaimOutcome,
  type SharedClaims,
} from "@/lib/claims";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Givers (KAM-77). Like getSharedWishlist(), these go through SECURITY
// DEFINER functions that require the list's share token: the sanctioned
// RLS bypass for the public share page (ARCHITECTURE.md, "Public Wishlist
// Sharing"). They work with an anonymous or signed-in client.

export async function claimSharedItem(
  supabase: DbClient,
  token: string,
  itemId: string,
  claimerKey: string,
  name: string | null,
): Promise<ClaimOutcome> {
  if (![token, itemId, claimerKey].every((v) => UUID_RE.test(v))) {
    return "not_found";
  }
  const { data, error } = await supabase.rpc("claim_shared_item", {
    token,
    p_item_id: itemId,
    p_claimer_key: claimerKey,
    p_name: name ?? undefined,
  });
  if (error) throw error;
  return toClaimOutcome(data);
}

export async function unclaimSharedItem(
  supabase: DbClient,
  token: string,
  itemId: string,
  claimerKey: string,
): Promise<boolean> {
  if (![token, itemId, claimerKey].every((v) => UUID_RE.test(v))) {
    return false;
  }
  const { data, error } = await supabase.rpc("unclaim_shared_item", {
    token,
    p_item_id: itemId,
    p_claimer_key: claimerKey,
  });
  if (error) throw error;
  return data === true;
}

export async function getSharedClaims(
  supabase: DbClient,
  token: string,
  claimerKey: string | null,
): Promise<SharedClaims> {
  if (!UUID_RE.test(token)) return parseSharedClaims(null);
  const { data, error } = await supabase.rpc("get_shared_claims", {
    token,
    // An unknown key simply matches nothing.
    p_claimer_key:
      claimerKey && UUID_RE.test(claimerKey)
        ? claimerKey
        : "00000000-0000-0000-0000-000000000000",
  });
  if (error) throw error;
  return parseSharedClaims(data);
}

// The owner's side. Reads through RLS (own items only); givers' keys are
// not readable at all.
export async function listClaimsOnMyItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("item_claims")
    .select("item_id, claimer_name, created_at");
  if (error) throw error;
  return new Map(data.map((c) => [c.item_id, c.claimer_name]));
}

export async function getShowClaims(supabase: DbClient): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("show_claims")
    .maybeSingle();
  if (error) throw error;
  return data?.show_claims ?? false;
}

export async function setShowClaims(supabase: DbClient, show: boolean) {
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("profiles")
    .update({ show_claims: show })
    .eq("id", userId);
  if (error) throw error;
}
