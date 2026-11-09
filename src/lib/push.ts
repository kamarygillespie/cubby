// Web Push (KAM-54). The VAPID public key identifies Cubby to browsers'
// push services; it's public by design. Its private half lives only in
// Supabase secrets (VAPID_PRIVATE_KEY) for the send-push-digest function.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BGCKW-FFLd4Wwh8qx6M-IGLgdIpQ6TYGfbzAK9-tgnqAsTrN7Gl2wGp0M1aq1X50jIeqZ1KYOJE1oYXjgf3z6bs";

// pushManager.subscribe wants the key as bytes.
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Settings form → values; the threshold is clamped to what the DB allows.
export function parseNotificationSettings(form: {
  get(name: string): FormDataEntryValue | null;
}) {
  const pct = Number(form.get("min_drop_percent"));
  return {
    price_drops: form.get("price_drops") === "on",
    store_sales: form.get("store_sales") === "on",
    min_drop_percent: Number.isFinite(pct)
      ? Math.min(90, Math.max(1, Math.round(pct)))
      : 10,
  };
}
