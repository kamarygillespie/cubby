import {
  EMPTY_RESULT,
  extractFromHtml,
  type AutofillResult,
} from "./extract.ts";

export const USER_AGENT = "CubbyLinkAutofill/1.0 (+personal wishlist app)";

// Basic SSRF guard: reject literal private/loopback/link-local hosts. This
// doesn't catch DNS rebinding (a public hostname resolving to an internal
// IP) — acceptable here since the function requires a signed-in user
// (auth: 'user' below), not open to anonymous internet traffic.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
];

export function isBlockedUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) =>
    pattern.test(url.hostname),
  );
}

// Fetches a product page and extracts title/image/prices. Never throws:
// network errors, timeouts and odd pages come back as EMPTY_RESULT.
export async function fetchProductData(url: URL): Promise<AutofillResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!response.ok) return EMPTY_RESULT;

    return extractFromHtml(await response.text());
  } catch {
    // Network error, timeout, or parse failure — fail gracefully to manual
    // entry per ARCHITECTURE.md, never a hard error.
    return EMPTY_RESULT;
  } finally {
    clearTimeout(timeout);
  }
}
