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

type ItemTypeRow = Awaited<ReturnType<typeof listItemTypes>>[number];

// The item-type picker's option groups, one per category.
export function groupItemTypesByCategory(itemTypes: ItemTypeRow[]) {
  const byCategory = new Map<
    string,
    { category: string; itemTypes: ItemTypeRow[] }
  >();
  for (const itemType of itemTypes) {
    const categoryName = itemType.category?.name ?? "Uncategorized";
    const group = byCategory.get(categoryName) ?? {
      category: categoryName,
      itemTypes: [],
    };
    group.itemTypes.push(itemType);
    byCategory.set(categoryName, group);
  }
  return [...byCategory.values()];
}
