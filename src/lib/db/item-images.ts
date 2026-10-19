import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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
