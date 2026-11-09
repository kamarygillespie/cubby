-- Shared wishlists no longer show the owner's item notes (KAM-38 decision,
-- Nov 9 2026): notes are personal ("wait for sale", "too pricey"). The
-- signature is unchanged so grants and older app builds keep working; the
-- notes column is always null.
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
    null::text,
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
