// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchProductData,
  isBlockedUrl,
  USER_AGENT,
} from "../_shared/fetch-page.ts";

const IMAGE_BUCKET = "item-images";
const MAX_IMAGE_BYTES = 5_000_000;

// Downloads a discovered image and re-uploads it into our own Storage bucket
// rather than returning the external URL directly. Keeps next/image's
// remote-pattern allowlist narrow (only our own bucket, never arbitrary
// external hosts) and means an item's image survives the source page
// changing or taking it down.
async function materializeImage(
  supabase: SupabaseClient,
  userId: string,
  imageUrl: URL,
): Promise<string | null> {
  if (isBlockedUrl(imageUrl)) return null;

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES)
      return null;

    const extension = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, bytes, { contentType });
    if (error) return null;

    const {
      data: { publicUrl },
    } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch {
    return null;
  }
}

const handler = {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    // pricesOnly: used by "Check price" on an existing item, which only
    // needs prices; skips downloading/copying the image into Storage.
    let body: { url?: unknown; pricesOnly?: unknown };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.url !== "string" || !body.url) {
      return Response.json({ error: "Missing 'url' field" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (isBlockedUrl(parsedUrl)) {
      return Response.json({ error: "URL not allowed" }, { status: 400 });
    }

    const result = await fetchProductData(parsedUrl);

    if (body.pricesOnly === true) {
      return Response.json({ ...result, image: null });
    }

    if (result.image && ctx.userClaims) {
      try {
        const imageUrl = new URL(result.image, parsedUrl);
        result.image = await materializeImage(
          ctx.supabase,
          ctx.userClaims.id,
          imageUrl,
        );
      } catch {
        result.image = null;
      }
    }

    return Response.json(result);
  }),
};

export default handler;
