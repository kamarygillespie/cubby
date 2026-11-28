import { checkItemPriceAction } from "@/app/items/price-actions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One item's price check, for Check all prices and Select mode (KAM-99).
// A route handler rather than a Server Action because Next.js dispatches
// Server Actions one at a time per browser, which made the "several stores
// at once" pool run one by one. Same check as the single-item Check price;
// signed-in only, and RLS limits it to the caller's own items.
export async function POST(request: Request) {
  let itemId: unknown;
  try {
    ({ itemId } = await request.json());
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  if (typeof itemId !== "string" || !UUID_RE.test(itemId)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const result = await checkItemPriceAction(itemId);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
