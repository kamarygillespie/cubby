// Pure wishlist rules, shared by server actions and tests.

export const WISHLIST_NAME_MAX_LENGTH = 60;

export type WishlistNameResult =
  { ok: true; name: string } | { ok: false; error: string };

export function parseWishlistName(raw: string): WishlistNameResult {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Give the list a name." };
  if (name.length > WISHLIST_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the name to ${WISHLIST_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, name };
}

// Every (wishlist, item) pair, deduplicated — the shape of wishlist_items rows.
export function wishlistItemPairs(itemIds: string[], wishlistIds: string[]) {
  const items = [...new Set(itemIds)];
  return [...new Set(wishlistIds)].flatMap((wishlist_id) =>
    items.map((item_id) => ({ wishlist_id, item_id })),
  );
}
