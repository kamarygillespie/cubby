-- Closet (KAM-47). Pieces you already own can be added straight to your
-- closet without ever being on a wishlist. They live in `items` (so outfits
-- can reference any closet piece uniformly) but are marked source='closet'
-- and are excluded from the wishlist, purchased/gifted tabs, and every
-- total — they were never wishes and their cost isn't new spending.
alter table public.items
  add column source text not null default 'wishlist'
  check (source in ('wishlist', 'closet'));

create index idx_items_user_source on public.items(user_id, source);
