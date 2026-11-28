"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  logOutfitWear,
  logWear,
  undoOutfitWear,
  undoWear,
} from "@/lib/db/wears";

// Cost per wear (KAM-85).
function refresh() {
  revalidatePath("/closet");
  revalidatePath("/outfits", "layout");
}

export async function wearAction(itemId: string) {
  await logWear(await createClient(), itemId);
  refresh();
}

export async function undoWearAction(itemId: string) {
  await undoWear(await createClient(), itemId);
  refresh();
}

export async function wearOutfitAction(outfitId: string) {
  const n = await logOutfitWear(await createClient(), outfitId);
  refresh();
  return n;
}

export async function undoOutfitWearAction(outfitId: string) {
  await undoOutfitWear(await createClient(), outfitId);
  refresh();
}
