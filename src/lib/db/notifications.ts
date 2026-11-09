import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { requireUserId } from "./auth";

type DbClient = SupabaseClient<Database>;

// Price-drop / favorite-store-sale alerts (KAM-54). Alerts are created by a
// database trigger after price checks; see migration 20261109060000.

export type NotificationSettings = {
  price_drops: boolean;
  store_sales: boolean;
  min_drop_percent: number;
};

// Matches the trigger's defaults when the user has never saved settings.
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  price_drops: true,
  store_sales: true,
  min_drop_percent: 10,
};

export async function getNotificationSettings(
  supabase: DbClient,
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("price_drops, store_sales, min_drop_percent")
    .maybeSingle();
  if (error) throw error;
  return data ?? DEFAULT_NOTIFICATION_SETTINGS;
}

export async function saveNotificationSettings(
  supabase: DbClient,
  settings: NotificationSettings,
) {
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("notification_settings").upsert({
    user_id: userId,
    ...settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function listNotifications(supabase: DbClient, limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, url, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function countUnreadNotifications(supabase: DbClient) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

// Marks one alert read and returns where it points, or null if it isn't
// yours / doesn't exist.
export async function openNotification(
  supabase: DbClient,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("url")
    .maybeSingle();
  if (error) throw error;
  return data?.url ?? null;
}

export async function markAllNotificationsRead(supabase: DbClient) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(
  supabase: DbClient,
  sub: PushSubscriptionKeys,
) {
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
  });
  if (error) throw error;
}

export async function deletePushSubscription(
  supabase: DbClient,
  endpoint: string,
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}
