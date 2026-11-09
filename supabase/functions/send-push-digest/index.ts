// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "../_shared/web-push.ts";
import { runDigest } from "./digest.ts";

// Called daily by pg_cron (migration 20261109060000) with the same shared
// secret as the price-check job. It reads every user's unpushed alerts and
// push subscriptions, so it uses the service role key: a deliberate,
// contained RLS bypass behind the secret. See ARCHITECTURE.md
// "Notifications".
Deno.serve(async (req) => {
  const secret = Deno.env.get("PRICE_CHECK_CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    return Response.json(
      { error: "VAPID keys not configured" },
      { status: 500 },
    );
  }
  const vapid = {
    publicKey,
    privateKey,
    subject: Deno.env.get("VAPID_SUBJECT") ?? "https://cubby-one.vercel.app",
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const summary = await runDigest({
    // Unpushed alerts from the last 2 days (older ones would be stale news).
    listPending: async () => {
      const since = new Date(Date.now() - 48 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, body, url")
        .is("pushed_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
    listSubscriptions: async (userIds) => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    send: (sub, message) => sendPush(sub, message, vapid),
    deleteSubscription: async (endpoint) => {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint);
    },
    markPushed: async (ids) => {
      const { error } = await supabase
        .from("notifications")
        .update({ pushed_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
  });

  return Response.json(summary);
});
