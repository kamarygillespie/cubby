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

// One row of get_shared_wishlist(). The function LEFT JOINs items, so a
// list with no visible items comes back as a single row with null item
// columns — generated types don't model that, hence this hand-written shape.
export type SharedWishlistRow = {
  wishlist_name: string;
  item_id: string | null;
  title: string | null;
  image_url: string | null;
  link: string | null;
  price: number | null;
  sale_price: number | null;
  notes: string | null;
  store_brand: string | null;
};

export type SharedWishlistItem = {
  id: string;
  title: string;
  image_url: string | null;
  link: string | null;
  price: number | null;
  sale_price: number | null;
  notes: string | null;
  store_brand: string | null;
};

export type SharedWishlist = { name: string; items: SharedWishlistItem[] };

// No rows means the token matched no list.
export function toSharedWishlist(
  rows: SharedWishlistRow[],
): SharedWishlist | null {
  if (rows.length === 0) return null;
  const items = rows.flatMap((row) =>
    row.item_id && row.title
      ? [
          {
            id: row.item_id,
            title: row.title,
            image_url: row.image_url,
            link: row.link,
            price: row.price,
            sale_price: row.sale_price,
            notes: row.notes,
            store_brand: row.store_brand,
          },
        ]
      : [],
  );
  return { name: rows[0].wishlist_name, items };
}
