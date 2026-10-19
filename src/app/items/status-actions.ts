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
  await updateItem(supabase, itemId, { [field]: value });
  revalidatePath("/");
}
