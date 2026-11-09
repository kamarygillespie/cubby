"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFavoriteStore, setStoreSaleUrl } from "@/lib/db/stores";
import { parseSaleUrl } from "@/lib/stores";

export type StoreFormState = { error: string } | null;

export async function toggleFavoriteStoreAction(
  storeName: string,
  favorite: boolean,
) {
  await setFavoriteStore(await createClient(), storeName, favorite);
  revalidatePath("/stores");
  revalidatePath("/");
}

export async function saveSaleUrlAction(
  key: string,
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const parsed = parseSaleUrl(String(formData.get("sale_url") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  try {
    await setStoreSaleUrl(await createClient(), key, parsed.url);
  } catch {
    return { error: "Couldn't save the link. Try again." };
  }
  revalidatePath("/stores");
  return null;
}
