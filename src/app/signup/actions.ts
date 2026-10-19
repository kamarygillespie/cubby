"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signUpPasswordError } from "@/lib/auth";

export type SignUpActionState = { error: string } | { success: true } | null;

export async function signUp(
  _prevState: SignUpActionState,
  formData: FormData,
): Promise<SignUpActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Re-checked here: the form's live check is just a convenience.
  const passwordError = signUpPasswordError(password, confirmPassword);
  if (passwordError) {
    return { error: passwordError };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // No email confirmation required (e.g. local dev): Supabase returns a
  // session and the user is already signed in — go straight to the app
  // rather than telling them to check an inbox that will stay empty.
  if (data.session) {
    redirect("/");
  }

  return { success: true };
}
