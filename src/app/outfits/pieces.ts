import { listClosetItems } from "@/lib/db/items";
import type { createClient } from "@/lib/supabase/server";
import type { ClosetPiece } from "./outfit-form";

// Closet pieces in the shape the outfit form's picker needs.
export async function closetPieces(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ClosetPiece[]> {
  return (await listClosetItems(supabase)).map((item) => ({
    id: item.id,
    title: item.title,
    image_url: item.image_url,
    typeName: item.item_type.name,
  }));
}
