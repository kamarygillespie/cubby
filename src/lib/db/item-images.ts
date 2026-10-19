import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { itemImagePathFromUrl } from "@/lib/item-form";

type DbClient = SupabaseClient<Database>;

const BUCKET = "item-images";

function extensionFromFile(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : null;
  if (fromName) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType || "bin";
}

export async function uploadItemImage(
  supabase: DbClient,
  userId: string,
  file: File,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${extensionFromFile(file)}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

// Removes a replaced/removed image from the bucket. Only touches files we
// host (external URLs are ignored), and storage RLS limits it to the
// caller's own folder. Best-effort: an orphaned file is harmless, so a
// failure here must not undo the item change that triggered it.
export async function deleteItemImage(
  supabase: DbClient,
  imageUrl: string | null,
) {
  const path = itemImagePathFromUrl(imageUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("Failed to delete item image", path, error);
}
