import { createClient } from "@/lib/supabase/client";

export type LinkDetails = {
  title: string | null;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  // Optional until the updated Edge Function is deployed everywhere.
  store?: string | null;
  category?: string | null;
  blocked?: boolean;
};

// Local Supabase (`supabase start`) returns Storage URLs using the internal
// Docker hostname — unreachable from a browser on the host. Production's
// SUPABASE_URL is the real public domain, so this never applies there.
function fixLocalStorageUrl(url: string): string {
  if (process.env.NODE_ENV !== "development") return url;
  return url.replace(
    "http://kong:8000",
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
}

// Asks Cubby's server to keep its own copy of a photo seen on the user's page.
export async function copyCapturedImage(
  link: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const { data, error } = await createClient().functions.invoke<{
      image: string | null;
    }>("link-autofill", { body: { url: link, imageUrl } });
    if (error || !data?.image) return null;
    return fixLocalStorageUrl(data.image);
  } catch {
    return null;
  }
}

// Reads a product page through the link-autofill Edge Function. Returns null
// when the page can't be read, so the caller can fall back to manual entry.
export async function fetchLinkDetails(
  link: string,
): Promise<LinkDetails | null> {
  try {
    const { data, error } = await createClient().functions.invoke<LinkDetails>(
      "link-autofill",
      { body: { url: link } },
    );
    if (error || !data) return null;
    return {
      ...data,
      image: data.image ? fixLocalStorageUrl(data.image) : null,
    };
  } catch {
    return null;
  }
}
