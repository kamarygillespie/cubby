-- Item notes on share pages again (KAM-101), per list. Kamary keeps size,
-- color and other specifics in notes, which givers need. This reverses the
-- Nov 9 KAM-38 rule that notes are never shared; a list can still hide them.

alter table public.wishlists
  add column show_notes boolean not null default true;

-- Same signature as 20261109080000, so grants and callers are unchanged;
-- notes come back when the list shows them.
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
    case when w.show_notes then i.notes end,
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
