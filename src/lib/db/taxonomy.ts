import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

// Every category visible to the caller (system + their own, via RLS) with
// its item types and how many of the caller's items use each type.
export async function listTaxonomy(supabase: DbClient) {
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, name, is_system, item_types(id, name, is_system, items(count))",
    )
    .order("name")
    .order("name", { referencedTable: "item_types" });

  if (error) throw error;
  return data.map((category) => ({
    ...category,
    item_types: category.item_types.map(({ items, ...type }) => ({
      ...type,
      itemCount: items[0]?.count ?? 0,
    })),
  }));
}

export type TaxonomyCategory = Awaited<ReturnType<typeof listTaxonomy>>[number];

export async function listCategories(supabase: DbClient) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, is_system")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createCategory(supabase: DbClient, name: string) {
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, user_id: userId, is_system: false })
    .select("id, name, is_system")
    .single();
  if (error) throw error;
  return data;
}

export async function createItemType(
  supabase: DbClient,
  name: string,
  categoryId: string,
) {
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("item_types")
    .insert({
      name,
      category_id: categoryId,
      user_id: userId,
      is_system: false,
    })
    .select("id, name, category:categories(id, name)")
    .single();
  if (error) throw error;
  return data;
}

// RLS limits rename/delete to the caller's own non-system rows; anything
// else matches zero rows, which we report as "not found".
async function expectOneRow(
  query: PromiseLike<{ data: unknown[] | null; error: unknown }>,
) {
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) {
    throw Object.assign(new Error("Not found"), { code: "not_found" });
  }
}

export async function renameCategory(
  supabase: DbClient,
  id: string,
  name: string,
) {
  await expectOneRow(
    supabase.from("categories").update({ name }).eq("id", id).select("id"),
  );
}

export async function renameItemType(
  supabase: DbClient,
  id: string,
  name: string,
) {
  await expectOneRow(
    supabase.from("item_types").update({ name }).eq("id", id).select("id"),
  );
}

export async function deleteCategory(supabase: DbClient, id: string) {
  await expectOneRow(
    supabase.from("categories").delete().eq("id", id).select("id"),
  );
}

export async function deleteItemType(supabase: DbClient, id: string) {
  await expectOneRow(
    supabase.from("item_types").delete().eq("id", id).select("id"),
  );
}

// Moves the caller's items to another item type. RLS limits it to the
// caller's own items, and the items policy only accepts visible types.
// Returns how many items actually changed.
export async function setItemsType(
  supabase: DbClient,
  itemIds: string[],
  itemTypeId: string,
) {
  if (itemIds.length === 0) return 0;
  const { data, error } = await supabase
    .from("items")
    .update({ item_type_id: itemTypeId })
    .in("id", itemIds)
    .select("id");
  if (error) throw error;
  return data.length;
}

// Merges one of the caller's own item types into another (system or own):
// moves its items over and deletes it, atomically (merge_item_type()).
// Returns how many items moved.
export async function mergeItemType(
  supabase: DbClient,
  sourceId: string,
  targetId: string,
) {
  const { data, error } = await supabase.rpc("merge_item_type", {
    p_source: sourceId,
    p_target: targetId,
  });
  if (error) throw error;
  return data;
}
