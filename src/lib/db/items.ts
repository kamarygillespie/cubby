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

// Wishlist items only (incl. purchased/gifted). Pieces added straight to the
// closet (source 'closet') are excluded here so they never reach the
// wishlist tabs or any total — see listClosetItems.
export async function listItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("source", "wishlist")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export type Item = Awaited<ReturnType<typeof listItems>>[number];

// The closet (lib/closet.ts isInCloset): pieces added to the closet, things
// bought for yourself (purchased, not gifted), and gifts you received
// (gifted, not purchased). Newest first.
export async function listClosetItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .or(
      "source.eq.closet,and(purchased.eq.true,gifted.eq.false),and(purchased.eq.false,gifted.eq.true)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

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

// Records a price check (manual or scheduled) through the database's single
// write path, record_price_check(): logs history, stamps price_checked_at,
// and only changes prices when a price was actually read. See the migration
// 20261109000000_price_checks.
export async function recordPriceCheck(
  supabase: DbClient,
  itemId: string,
  fetched: { price: number | null; salePrice: number | null },
) {
  const { error } = await supabase.rpc("record_price_check", {
    p_item_id: itemId,
    // Generated types mark args non-null; SQL accepts null (unreadable page).
    p_price: fetched.price as number,
    p_sale_price: fetched.salePrice as number,
  });
  if (error) throw error;
}

// Effective prices (sale price when on sale) for the given items, for the
// even-split generator. RLS limits it to the caller's own items.
export async function getEffectivePrices(supabase: DbClient, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("items")
    .select("id, price, sale_price")
    .in("id", ids);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    price:
      row.price === null
        ? null
        : row.sale_price !== null && row.sale_price < row.price
          ? row.sale_price
          : row.price,
  }));
}

// Highest effective price each item has had in readable checks over the last
// `days` days (price history, KAM-43). Used to spot recent price drops.
export async function listRecentPriceHighs(supabase: DbClient, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("item_price_checks")
    .select("item_id, price, sale_price")
    .eq("status", "ok")
    .gte("checked_at", since);
  if (error) throw error;
  const highs = new Map<string, number>();
  for (const row of data) {
    if (row.price === null) continue;
    const eff =
      row.sale_price !== null && row.sale_price < row.price
        ? row.sale_price
        : row.price;
    highs.set(row.item_id, Math.max(highs.get(row.item_id) ?? 0, eff));
  }
  return highs;
}
