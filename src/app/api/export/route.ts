import { createClient } from "@/lib/supabase/server";
import { listAllItemsForExport } from "@/lib/db/items";
import { itemsToCsv } from "@/lib/item-transfer";

// "Download a backup" (KAM-87): every item as CSV. Signed-in only; RLS
// limits it to the user's own items.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const csv = itemsToCsv(await listAllItemsForExport(supabase));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cubby-items-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
