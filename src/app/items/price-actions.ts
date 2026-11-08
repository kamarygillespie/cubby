"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getItem, updateItem } from "@/lib/db/items";
import {
  applyPriceCheck,
  type FetchedPrices,
  type PriceCheckOutcome,
} from "@/lib/price-check";

export type CheckPriceResult = {
  outcome: PriceCheckOutcome | "error";
  message: string;
};

// Re-reads an item's product page via the link-autofill Edge Function
// (prices only, no image copy) and stores any price change.
export async function checkItemPriceAction(
  itemId: string,
): Promise<CheckPriceResult> {
  const supabase = await createClient();
  const item = await getItem(supabase, itemId);
  if (!item) return { outcome: "error", message: "Item not found." };
  if (!item.link) {
    return { outcome: "error", message: "Add a link to check its price." };
  }

  const { data, error } = await supabase.functions.invoke<FetchedPrices>(
    "link-autofill",
    { body: { url: item.link, pricesOnly: true } },
  );
  if (error || !data) {
    return { outcome: "unreadable", message: "Couldn't reach this page." };
  }

  const result = applyPriceCheck(item, {
    price: data.price ?? null,
    salePrice: data.salePrice ?? null,
  });
  if (result.update) {
    await updateItem(supabase, itemId, result.update);
    revalidatePath("/", "layout");
  }
  return { outcome: result.outcome, message: result.message };
}
