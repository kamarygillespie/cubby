"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createItem,
  deleteItem,
  deleteItems,
  getItem,
  recordPriceCheck,
  updateItem,
} from "@/lib/db/items";
import {
  deleteItemImage,
  deleteItemImages,
  uploadItemImage,
} from "@/lib/db/item-images";
import { parseItemForm } from "@/lib/item-form";
import { deletedItemsMessage } from "@/lib/wishlists";
import type { BulkResult } from "../types/actions";
import type { ItemFormState } from "./item-form-state";
import { checkItemPriceAction } from "./price-actions";
import { markLookingForFound } from "@/lib/db/looking-for";

function chosenFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

// Only known in-app destinations, so return_to can't become an open redirect.
function safeReturnTo(formData: FormData): "/" | "/closet" {
  return formData.get("return_to") === "/closet" ? "/closet" : "/";
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

    const item = await createItem(supabase, {
      ...parsed.values,
      image_url: imageUrl,
    });
    // "Found it" from the Looking for list (KAM-102): tick the entry off.
    const lookingForId = String(formData.get("looking_for_id") ?? "");
    if (lookingForId) {
      await markLookingForFound(supabase, lookingForId, item.id);
      revalidatePath("/looking-for");
    }
    // KAM-98: once the item is saved and the page has moved on, run the
    // same check as "Check price", so the saved price and sale always match
    // what Check price would say, however the item was added (pasted link,
    // Save to Cubby, share). An unreadable page never overwrites a price.
    if (item.link) {
      const itemId = item.id;
      after(async () => {
        try {
          await checkItemPriceAction(itemId);
        } catch {
          // Best effort: the item is saved either way.
        }
      });
    }
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

    // A price typed in by hand counts as a successful check (KAM-90), so
    // the item stops showing "Check by hand". Recorded after the update,
    // so the check sees no change and can't send a price alert.
    const { price, sale_price } = parsed.values;
    if (
      existing.link &&
      !existing.purchased &&
      !existing.gifted &&
      price != null &&
      (price !== existing.price || sale_price !== existing.sale_price)
    ) {
      await recordPriceCheck(supabase, itemId, {
        price,
        salePrice: sale_price ?? null,
      });
    }

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
  redirect(safeReturnTo(formData));
}

export async function deleteItemAction(
  itemId: string,
  // null stays on the current page, keeping its tab and filters.
  returnTo: "/" | "/closet" | null = "/",
) {
  const supabase = await createClient();
  const existing = await getItem(supabase, itemId);
  if (existing) {
    // wishlist_items rows cascade with the item.
    await deleteItem(supabase, itemId);
    await deleteItemImage(supabase, existing.image_url);
  }
  revalidateItemViews();
  if (returnTo) redirect(returnTo);
}

// "Delete" on items picked in Select mode (KAM-76). Stays on the current
// page, so the tab and filters are kept; the caller shows the message.
export async function deleteItemsAction(
  itemIds: string[],
): Promise<BulkResult> {
  if (itemIds.length === 0) return { ok: false, error: "Select some items." };
  try {
    const supabase = await createClient();
    // wishlist_items rows cascade with each item.
    const deleted = await deleteItems(supabase, itemIds);
    await deleteItemImages(
      supabase,
      deleted.map((item) => item.image_url),
    );
    revalidateItemViews();
    return { ok: true, message: deletedItemsMessage(deleted.length) };
  } catch {
    return { ok: false, error: "Couldn't delete the items. Try again." };
  }
}

// "Add to closet": a piece you already own, never on a wishlist. Stored with
// source 'closet' so it never counts toward wishlist totals or spending.
export async function addClosetItem(
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
    await createItem(supabase, {
      ...parsed.values,
      price: null,
      sale_price: null,
      interest_level: null,
      source: "closet",
      image_url: file ? await uploadItemImage(supabase, user.id, file) : null,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add piece.",
    };
  }

  revalidateItemViews();
  redirect("/closet");
}
