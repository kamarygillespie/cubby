"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createItem, deleteItem, getItem, updateItem } from "@/lib/db/items";
import { deleteItemImage, uploadItemImage } from "@/lib/db/item-images";
import { parseItemForm } from "@/lib/item-form";
import type { ItemFormState } from "./item-form-state";

function chosenFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

function revalidateItemViews() {
  revalidatePath("/");
  revalidatePath("/wishlists", "layout");
}

export async function addItem(
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = parseItemForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const file = chosenFile(formData);
    const autofillImageUrl =
      String(formData.get("autofill_image_url") ?? "").trim() || null;
    // A manually chosen file always wins over whatever the link autofill
    // fetched, matching "full manual edit + image replacement" in FEATURES.md.
    const imageUrl = file
      ? await uploadItemImage(supabase, user.id, file)
      : autofillImageUrl;

    await createItem(supabase, { ...parsed.values, image_url: imageUrl });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add item.",
    };
  }

  revalidateItemViews();
  redirect("/");
}

export async function updateItemAction(
  itemId: string,
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = parseItemForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const existing = await getItem(supabase, itemId);
    if (!existing) return { error: "This item no longer exists." };

    // Image: a new file replaces it, "remove" clears it, otherwise keep.
    const file = chosenFile(formData);
    const removing = formData.get("remove_image") === "1";
    const imageUrl = file
      ? await uploadItemImage(supabase, user.id, file)
      : removing
        ? null
        : existing.image_url;

    await updateItem(supabase, itemId, {
      ...parsed.values,
      image_url: imageUrl,
    });

    // Only after the row points elsewhere, so a failed update never leaves
    // the item referencing a deleted file.
    if (imageUrl !== existing.image_url) {
      await deleteItemImage(supabase, existing.image_url);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save item.",
    };
  }

  revalidateItemViews();
  redirect("/");
}

export async function deleteItemAction(itemId: string) {
  const supabase = await createClient();
  const existing = await getItem(supabase, itemId);
  if (existing) {
    // wishlist_items rows cascade with the item.
    await deleteItem(supabase, itemId);
    await deleteItemImage(supabase, existing.image_url);
  }
  revalidateItemViews();
  redirect("/");
}
