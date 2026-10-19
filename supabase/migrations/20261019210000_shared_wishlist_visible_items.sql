-- Reworks the public share function (same signature, so grants are kept):
--
-- 1. LEFT JOIN, so a valid token for a list with no visible items still
--    returns one row (wishlist_name set, item columns null). Previously an
--    empty list was indistinguishable from an invalid token, and the share
--    page would 404 on a link the owner had just shared.
-- 2. Hide purchased/gifted items. The share page is for gift-givers; showing
--    something the owner already has invites a duplicate gift. The owner's
--    own list view still shows them, labeled.
-- 3. Pin search_path, as Supabase recommends for SECURITY DEFINER functions.

create or replace function public.get_shared_wishlist(token uuid)
returns table (
  wishlist_name text,
  item_id uuid,
  title text,
  image_url text,
  link text,
  price numeric,
  sale_price numeric,
  notes text,
  store_brand text
) as $$
  select
    w.name,
    i.id,
    i.title,
    i.image_url,
    i.link,
    i.price,
    i.sale_price,
    i.notes,
    i.store_brand
  from public.wishlists w
  left join (
    public.wishlist_items wi
    join public.items i
      on i.id = wi.item_id and not i.purchased and not i.gifted
  ) on wi.wishlist_id = w.id
  where w.share_token = token
  order by wi.added_at desc nulls last;
$$ language sql security definer stable set search_path = '';
