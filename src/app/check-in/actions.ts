"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { archiveItem, keepItem, restoreItem } from "@/lib/db/items";
import { dismissCheckIn } from "@/lib/db/profile";

// Cooling-off check-in (KAM-82). The check-in page itself isn't refreshed,
// so each row stays in place showing "Kept", "Archived" or "Back on your
// wishlist" while the user works down the list.
function refresh() {
  revalidatePath("/");
  revalidatePath("/wishlists", "layout");
}

export async function keepAction(itemId: string) {
  await keepItem(await createClient(), itemId);
  refresh();
}

export async function archiveAction(itemId: string) {
  await archiveItem(await createClient(), itemId);
  refresh();
}

export async function restoreAction(itemId: string) {
  await restoreItem(await createClient(), itemId);
  refresh();
}

export async function dismissCheckInAction() {
  await dismissCheckIn(await createClient());
  revalidatePath("/");
}
