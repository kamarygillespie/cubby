"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deletePushSubscription,
  markAllNotificationsRead,
  saveNotificationSettings,
  savePushSubscription,
  type PushSubscriptionKeys,
} from "@/lib/db/notifications";
import { parseNotificationSettings } from "@/lib/push";

export type SettingsFormState = { saved: boolean; error?: string } | null;

export async function saveSettingsAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  try {
    await saveNotificationSettings(
      await createClient(),
      parseNotificationSettings(formData),
    );
  } catch {
    return { saved: false, error: "Couldn't save. Try again." };
  }
  revalidatePath("/notifications");
  return { saved: true };
}

export async function subscribePushAction(sub: PushSubscriptionKeys) {
  if (
    typeof sub?.endpoint !== "string" ||
    !sub.endpoint.startsWith("https://") ||
    typeof sub.p256dh !== "string" ||
    typeof sub.auth !== "string"
  ) {
    throw new Error("Invalid push subscription");
  }
  await savePushSubscription(await createClient(), sub);
}

export async function unsubscribePushAction(endpoint: string) {
  await deletePushSubscription(await createClient(), endpoint);
}

export async function markAllReadAction() {
  await markAllNotificationsRead(await createClient());
  revalidatePath("/notifications");
  revalidatePath("/");
}
