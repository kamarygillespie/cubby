// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { fetchProductData, isBlockedUrl } from "../_shared/fetch-page.ts";
import { runPriceChecks } from "./run.ts";

// Called hourly by pg_cron (migration 20261109000000) with a shared secret
// header. It re-checks prices for everyone's active wishlist items, so it
// uses the service role key: a deliberate, contained RLS bypass. The only
// way in is the secret, and all writes go through record_price_check(),
// which never wipes a known price. See ARCHITECTURE.md "Sale Detection".
Deno.serve(async (req) => {
  const secret = Deno.env.get("PRICE_CHECK_CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const summary = await runPriceChecks(
    {
      // Active wishlist items with a link, not checked in ~20h, oldest first.
      listDue: async (limit) => {
        const cutoff = new Date(Date.now() - 20 * 3600_000).toISOString();
        const { data, error } = await supabase
          .from("items")
          .select("id, link")
          .not("link", "is", null)
          .eq("purchased", false)
          .eq("gifted", false)
          .or(`price_checked_at.is.null,price_checked_at.lt.${cutoff}`)
          .order("price_checked_at", { ascending: true, nullsFirst: true })
          .limit(limit);
        if (error) throw error;
        return data as { id: string; link: string }[];
      },
      fetchPrices: async (url) => {
        if (isBlockedUrl(url)) return { price: null, salePrice: null };
        const { price, salePrice } = await fetchProductData(url);
        return { price, salePrice };
      },
      record: async (itemId, prices) => {
        const { error } = await supabase.rpc("record_price_check", {
          p_item_id: itemId,
          p_price: prices.price,
          p_sale_price: prices.salePrice,
        });
        if (error) throw error;
      },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now(),
    },
    // Hourly runs × 25 items ≈ 600 checks/day. Well under the 150s Edge
    // Function wall-clock limit.
    { batchSize: 25, budgetMs: 100_000, delayMs: 1000 },
  );

  return Response.json(summary);
});
