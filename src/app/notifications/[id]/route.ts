import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openNotification } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

// Tapping an alert in the list: mark it read, then go where it points.
// Alert URLs are app-relative paths (enforced by a DB check), so this can't
// redirect off-site.
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/notifications/[id]">,
) {
  const { id } = await params;
  let url: string | null = null;
  try {
    url = await openNotification(await createClient(), id);
  } catch {
    // bad id etc. — fall back to the list
  }
  const safe =
    url?.startsWith("/") && !url.startsWith("//") ? url : "/notifications";
  return NextResponse.redirect(new URL(safe, request.url));
}
