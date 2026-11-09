"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateItem } from "@/lib/db/items";

export async function setItemFlag(
  itemId: string,
  field: "purchased" | "gifted",
  value: boolean,
) {
  const supabase = await createClient();
  try {
    await updateItem(supabase, itemId, { [field]: value });
  } catch (error) {
    // PGRST116 = no row matched: the item was deleted (another tab, or a
    // stale page). Nothing to update; the refresh below drops its card.
    if ((error as { code?: string })?.code !== "PGRST116") throw error;
  }
  revalidatePath("/");
}
