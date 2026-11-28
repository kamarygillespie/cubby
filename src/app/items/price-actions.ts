"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getItem, recordPriceCheck, setTargetPrice } from "@/lib/db/items";
import { parseTargetPrice } from "@/lib/item-form";
import {
  applyPriceCheck,
  stockMessage,
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

  const { data, error } = await supabase.functions.invoke<
    FetchedPrices & {
      blocked?: boolean;
      store?: string | null;
      // Stock for the size in the notes (KAM-75).
      stock?: { inStock: boolean | null; size: string | null };
    }
  >("link-autofill", {
    body: { url: item.link, pricesOnly: true, notes: item.notes },
  });
  if (error || !data) {
    return { outcome: "unreadable", message: "Couldn't reach this page." };
  }

  const fetched = {
    price: data.price ?? null,
    salePrice: data.salePrice ?? null,
    inStock: data.stock?.inStock ?? null,
    stockSize: data.stock?.size ?? null,
  };
  // The message is worked out here; the write (incl. "never wipe a known
  // price") happens in the database's record_price_check().
  const result = applyPriceCheck(item, fetched);
  await recordPriceCheck(supabase, itemId, fetched);
  revalidatePath("/", "layout");
  return {
    outcome: result.outcome,
    message: data.blocked
      ? `${data.store ?? "This store"} doesn't let apps check its prices.`
      : [
          result.message,
          fetched.price === null
            ? null
            : stockMessage(item.in_stock, fetched.inStock, fetched.stockSize),
        ]
          .filter(Boolean)
          .join(" "),
  };
}

// Save to Cubby on a saved item: the price the user sees on the store's page.
export async function refreshPriceFromPage(
  itemId: string,
  price: number,
  salePrice: number | null,
): Promise<{ error: string } | void> {
  const valid = (value: number) =>
    Number.isFinite(value) && value > 0 && value < 10_000_000;
  if (!valid(price) || (salePrice !== null && !valid(salePrice))) {
    return { error: "That price doesn't look right." };
  }

  const supabase = await createClient();
  const item = await getItem(supabase, itemId);
  if (!item) return { error: "Item not found." };

  await recordPriceCheck(supabase, itemId, { price, salePrice });
  revalidatePath("/", "layout");
  redirect("/");
}

// "Alert me at or under $X" from the details sheet (KAM-81).
export async function setTargetPriceAction(
  itemId: string,
  raw: string,
): Promise<{ ok: true; target: number | null } | { ok: false; error: string }> {
  const parsed = parseTargetPrice(raw);
  if (!parsed.ok) return parsed;
  try {
    await setTargetPrice(await createClient(), itemId, parsed.value);
  } catch {
    return { ok: false, error: "Couldn't save the alert. Try again." };
  }
  revalidatePath("/");
  return { ok: true, target: parsed.value };
}
