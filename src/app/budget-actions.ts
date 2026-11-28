"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setMonthlyBudget } from "@/lib/db/profile";
import { parseBudget } from "@/lib/spending";

// Monthly budget on Totals (KAM-84). Blank clears it.
export async function setBudgetAction(
  raw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseBudget(raw);
  if (!parsed.ok) return parsed;
  try {
    await setMonthlyBudget(await createClient(), parsed.value);
  } catch {
    return { ok: false, error: "Couldn't save the budget. Try again." };
  }
  revalidatePath("/");
  return { ok: true };
}
