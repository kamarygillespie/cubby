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

// Wishlist items only (incl. purchased/gifted, not archived). Pieces added straight to the
// closet (source 'closet') are excluded here so they never reach the
// wishlist tabs or any total — see listClosetItems.
export async function listItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("source", "wishlist")
    // Archived in the cooling-off check-in (KAM-82): off the wishlist and
    // every total until restored.
    .is("archived_at", null)
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

// The saved item for a product page, ignoring differences like the size or
// color in the link's query. RLS limits it to the caller's own items.
export async function findItemByProductLink(supabase: DbClient, link: string) {
  let page: URL;
  try {
    page = new URL(link);
  } catch {
    return null;
  }
  const base = `${page.origin}${page.pathname}`;
  const pattern = base.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .like("link", `${pattern}%`)
    .limit(20);
  if (error) throw error;
  return (
    data.find((item) => {
      try {
        const saved = new URL(item.link ?? "");
        return `${saved.origin}${saved.pathname}` === base;
      } catch {
        return false;
      }
    }) ?? null
  );
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

// Deletes several items in one statement (KAM-76). RLS limits it to the
// caller's own items; returns what was actually deleted, so the caller can
// remove those items' photos and report a true count.
export async function deleteItems(supabase: DbClient, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("items")
    .delete()
    .in("id", ids)
    .select("id, image_url");
  if (error) throw error;
  return data;
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

// Items whose most recent price check couldn't read the store's page, so the
// app doesn't imply a price is being tracked when it isn't.
export async function listItemsWithFailedPriceCheck(
  supabase: DbClient,
  days = 3,
) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("item_price_checks")
    .select("item_id, status")
    .gte("checked_at", since)
    .order("checked_at", { ascending: false });
  if (error) throw error;
  const latest = new Map<string, string>();
  for (const row of data) {
    if (!latest.has(row.item_id)) latest.set(row.item_id, row.status);
  }
  return new Set(
    [...latest]
      .filter(([, status]) => status === "unreadable")
      .map(([id]) => id),
  );
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

// "Alert me at or under $X" (KAM-81). Null clears it. RLS limits it to the
// caller's own items. The alert itself comes from notify_price_change().
export async function setTargetPrice(
  supabase: DbClient,
  itemId: string,
  target: number | null,
) {
  const { error } = await supabase
    .from("items")
    .update({ target_price: target })
    .eq("id", itemId);
  if (error) throw error;
}

// A purchased item's return window (KAM-83), "YYYY-MM-DD" or null. Mark
// returned is just purchased = false: the purchase trigger clears the date
// and the window, so it leaves spending totals.
export async function setReturnBy(
  supabase: DbClient,
  itemId: string,
  date: string | null,
) {
  const { error } = await supabase
    .from("items")
    .update({ return_by: date })
    .eq("id", itemId);
  if (error) throw error;
}

// Cooling-off check-in (KAM-82). Archiving also takes the item off every
// list, so share pages never show something set aside. Restoring puts it
// back on the wishlist (not on its old lists).
export async function archiveItem(supabase: DbClient, itemId: string) {
  const { error } = await supabase
    .from("items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("purchased", false)
    .eq("gifted", false);
  if (error) throw error;
  const { error: listError } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("item_id", itemId);
  if (listError) throw listError;
}

export async function keepItem(supabase: DbClient, itemId: string) {
  const { error } = await supabase
    .from("items")
    .update({ kept_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}

export async function restoreItem(supabase: DbClient, itemId: string) {
  const { error } = await supabase
    .from("items")
    .update({ archived_at: null, kept_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}

export async function listArchivedItems(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("source", "wishlist")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Every item the user has, for the CSV export (KAM-87): wishlist (incl.
// archived), bought, gifts and closet pieces. RLS limits it to their own.
export async function listAllItemsForExport(supabase: DbClient) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Many new items in one insert (CSV import, KAM-87). Never updates
// existing rows. RLS checks each row's user and item type. Give every row
// the same keys: PostgREST sends an explicit NULL (not the column default)
// for a key missing from some rows of a batch.
export async function createItems(
  supabase: DbClient,
  rows: Database["public"]["Tables"]["items"]["Insert"][],
) {
  if (rows.length === 0) return 0;
  const { error, count } = await supabase
    .from("items")
    .insert(rows, { count: "exact" });
  if (error) throw error;
  return count ?? rows.length;
}
