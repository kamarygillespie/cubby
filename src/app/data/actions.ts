"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createItems } from "@/lib/db/items";
import { listItemTypes } from "@/lib/db/item-types";
import { itemImagePathFromUrl } from "@/lib/item-form";
import {
  MAX_IMPORT_ROWS,
  parseImportRow,
  type ColumnMap,
} from "@/lib/item-transfer";

export type ImportResult =
  { ok: true; added: number; skipped: number } | { ok: false; error: string };

// CSV import (KAM-87). The browser sends the raw rows and column mapping,
// and this parses them again itself rather than trusting parsed values.
// Images: only copies already saved into this user's own storage folder
// (by the Edge Function, row index → URL) are accepted.
export async function importItemsAction(input: {
  rows: string[][];
  map: ColumnMap;
  fallbackTypeId: string;
  images: Record<number, string>;
}): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!Array.isArray(input.rows) || input.rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Import up to ${MAX_IMPORT_ROWS} items at a time.`,
    };
  }

  const types = await listItemTypes(supabase);
  if (!types.some((t) => t.id === input.fallbackTypeId)) {
    return { ok: false, error: "Pick an item type for unmatched rows." };
  }
  const byName = new Map(types.map((t) => [t.name.toLowerCase(), t.id]));
  const ownImage = (url: string | undefined) => {
    const path = url ? itemImagePathFromUrl(url) : null;
    return path?.startsWith(`${user.id}/`) ? url! : null;
  };

  let skipped = 0;
  const now = new Date().toISOString();
  const inserts = input.rows.flatMap((row, i) => {
    const parsed = parseImportRow(
      Array.isArray(row) ? row.map(String) : [],
      input.map,
    );
    if (!parsed.ok) {
      skipped++;
      return [];
    }
    const r = parsed.value;
    const purchased = r.status === "purchased" || r.status === "bought_as_gift";
    const gifted =
      r.status === "gift_received" || r.status === "bought_as_gift";
    return [
      {
        user_id: user.id,
        title: r.title,
        item_type_id:
          (r.itemType && byName.get(r.itemType.toLowerCase())) ||
          input.fallbackTypeId,
        source: r.status === "closet" ? "closet" : "wishlist",
        purchased,
        gifted,
        purchased_date: purchased
          ? r.purchasedOn
            ? `${r.purchasedOn}T12:00:00Z`
            : now
          : null,
        archived_at: r.status === "archived" ? now : null,
        store_brand: r.store,
        price: r.status === "closet" ? null : r.price,
        sale_price: r.status === "closet" ? null : r.salePrice,
        interest_level: r.status === "closet" ? null : r.interest,
        link: r.link,
        image_url: ownImage(input.images?.[i]),
        notes: r.notes,
      },
    ];
  });

  try {
    const added = await createItems(supabase, inserts);
    revalidatePath("/", "layout");
    return { ok: true, added, skipped };
  } catch {
    return {
      ok: false,
      error: "Couldn't add the items. Nothing was imported.",
    };
  }
}
