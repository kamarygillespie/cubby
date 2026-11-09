-- wishlist_items' primary key is (wishlist_id, item_id), which can't serve
-- lookups by item_id alone: the ON DELETE CASCADE when an item is deleted,
-- and "which lists is this item on". Found in the KAM-45 performance pass.
create index if not exists idx_wishlist_items_item_id on public.wishlist_items(item_id);
