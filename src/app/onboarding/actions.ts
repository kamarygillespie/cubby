"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dismissOnboarding } from "@/lib/db/profile";

export async function dismissOnboardingAction() {
  await dismissOnboarding(await createClient());
  revalidatePath("/");
}
