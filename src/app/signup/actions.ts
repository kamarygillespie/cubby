"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type SignUpActionState = { error: string } | { success: true } | null;

export async function signUp(
  _prevState: SignUpActionState,
  formData: FormData,
): Promise<SignUpActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
