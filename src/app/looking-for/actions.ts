"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addLookingFor, removeLookingFor } from "@/lib/db/looking-for";
import { parseLookingFor } from "@/lib/looking-for";

// "Looking for" (KAM-102).
export async function addLookingForAction(
  _prev: { error?: string; added?: string } | null,
  formData: FormData,
): Promise<{ error?: string; added?: string }> {
  const parsed = parseLookingFor({
    title: formData.get("title"),
    notes: formData.get("notes"),
    budget: formData.get("budget"),
  });
  if (!parsed.ok) return { error: parsed.error };
  try {
    await addLookingFor(await createClient(), parsed.value);
  } catch {
    return { error: "Couldn't add it. Try again." };
  }
  revalidatePath("/looking-for");
  revalidatePath("/");
  return { added: parsed.value.title };
}

export async function removeLookingForAction(id: string) {
  await removeLookingFor(await createClient(), id);
  revalidatePath("/looking-for");
  revalidatePath("/");
}
