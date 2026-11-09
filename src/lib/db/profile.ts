import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

// The parts of the first-run checklist (KAM-46) the home page doesn't
// already load: whether it was hidden, and whether any device has push on.
export async function getOnboardingState(supabase: DbClient) {
  const [profile, devices] = await Promise.all([
    supabase.from("profiles").select("onboarding_dismissed_at").maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true }),
  ]);
  if (profile.error) throw profile.error;
  if (devices.error) throw devices.error;
  return {
    dismissed: Boolean(profile.data?.onboarding_dismissed_at),
    hasPushDevice: (devices.count ?? 0) > 0,
  };
}

export async function dismissOnboarding(supabase: DbClient) {
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
