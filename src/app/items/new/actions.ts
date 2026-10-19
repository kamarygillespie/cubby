"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createItem } from "@/lib/db/items";

export type AddItemActionState = { error: string } | null;

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function addItem(
  _prevState: AddItemActionState,
  formData: FormData,
): Promise<AddItemActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const itemTypeId = String(formData.get("item_type_id") ?? "");

  if (!title) {
    return { error: "Title is required." };
  }
  if (!itemTypeId) {
    return { error: "Item type is required." };
  }

  const supabase = await createClient();

  try {
    await createItem(supabase, {
      title,
      item_type_id: itemTypeId,
      price: parseOptionalNumber(formData.get("price")),
      sale_price: parseOptionalNumber(formData.get("sale_price")),
      interest_level: parseOptionalNumber(formData.get("interest_level")),
      store_brand: String(formData.get("store_brand") ?? "").trim() || null,
      link: String(formData.get("link") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add item.",
    };
  }

  revalidatePath("/");
  redirect("/");
}
