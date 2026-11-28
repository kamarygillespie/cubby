"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setReturnBy, updateItem } from "@/lib/db/items";
import { parseOccasionDate } from "@/lib/occasion";

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

// Return window on a purchased item (KAM-83). Blank clears it.
export async function setReturnByAction(
  itemId: string,
  raw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseOccasionDate(raw);
  if (!parsed.ok) return parsed;
  try {
    await setReturnBy(await createClient(), itemId, parsed.value);
  } catch {
    return { ok: false, error: "Couldn't save the date. Try again." };
  }
  revalidatePath("/");
  return { ok: true };
}
