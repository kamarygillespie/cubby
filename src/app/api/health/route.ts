import { createClient } from "@/lib/supabase/server";
import { pingDatabase } from "@/lib/db/health";

// Hit daily by Vercel Cron (keeps the free-tier Supabase project from
// auto-pausing) and by the keep-alive GitHub Action (alerts if it's down).
// Public and harmless: one tiny read, no user data. See TESTING.md.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await pingDatabase(await createClient());
    return Response.json({ ok: true, database: "up", categories });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503 });
  }
}
