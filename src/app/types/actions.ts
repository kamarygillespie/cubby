"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCategory,
  createItemType,
  deleteCategory,
  deleteItemType,
  renameCategory,
  renameItemType,
} from "@/lib/db/taxonomy";
import { parseTaxonomyName, taxonomyErrorMessage } from "@/lib/taxonomy";

export type CreatedItemType = {
  id: string;
  name: string;
  category: { id: string; name: string };
};

export type CreateItemTypeResult =
  { ok: true; itemType: CreatedItemType } | { ok: false; error: string };

function revalidateTaxonomyViews() {
  revalidatePath("/", "layout");
}

// Used by the "+ New type" dialog on the item form: creates the type, and
// first a new category if one was named.
export async function createItemTypeAction(input: {
  name: string;
  categoryId: string | null;
  newCategoryName: string;
}): Promise<CreateItemTypeResult> {
  const typeName = parseTaxonomyName(input.name);
  if (!typeName.ok) return { ok: false, error: typeName.error };

  const wantsNewCategory = input.newCategoryName.trim() !== "";
  const categoryName = wantsNewCategory
    ? parseTaxonomyName(input.newCategoryName)
    : null;
  if (categoryName && !categoryName.ok) {
    return { ok: false, error: categoryName.error };
  }
  if (!categoryName && !input.categoryId) {
    return { ok: false, error: "Pick a category or name a new one." };
  }

  const supabase = await createClient();
  let categoryId = input.categoryId;
  if (categoryName?.ok) {
    try {
      categoryId = (await createCategory(supabase, categoryName.name)).id;
    } catch (error) {
      return { ok: false, error: taxonomyErrorMessage(error, "category") };
    }
  }

  try {
    const created = await createItemType(supabase, typeName.name, categoryId!);
    revalidateTaxonomyViews();
    return {
      ok: true,
      itemType: {
        id: created.id,
        name: created.name,
        // Always present: the insert just referenced a visible category.
        category: created.category!,
      },
    };
  } catch (error) {
    return { ok: false, error: taxonomyErrorMessage(error, "item type") };
  }
}

export type TaxonomyFormState = { error: string } | null;

export async function createCategoryAction(
  _prev: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const parsed = parseTaxonomyName(String(formData.get("name") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createCategory(await createClient(), parsed.name);
  } catch (error) {
    return { error: taxonomyErrorMessage(error, "category") };
  }
  revalidateTaxonomyViews();
  return null;
}

export async function addItemTypeAction(
  categoryId: string,
  _prev: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const result = await createItemTypeAction({
    name: String(formData.get("name") ?? ""),
    categoryId,
    newCategoryName: "",
  });
  return result.ok ? null : { error: result.error };
}

export async function renameAction(
  kind: "category" | "item type",
  id: string,
  _prev: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const parsed = parseTaxonomyName(String(formData.get("name") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  try {
    if (kind === "category") await renameCategory(supabase, id, parsed.name);
    else await renameItemType(supabase, id, parsed.name);
  } catch (error) {
    return { error: taxonomyErrorMessage(error, kind) };
  }
  revalidateTaxonomyViews();
  return null;
}

export async function deleteAction(
  kind: "category" | "item type",
  id: string,
): Promise<TaxonomyFormState> {
  const supabase = await createClient();
  try {
    if (kind === "category") await deleteCategory(supabase, id);
    else await deleteItemType(supabase, id);
  } catch (error) {
    return { error: taxonomyErrorMessage(error, kind) };
  }
  revalidateTaxonomyViews();
  return null;
}
