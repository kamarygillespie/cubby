-- Share page extras: the owner's sizes (KAM-78) and a "Most wanted" flag
-- (KAM-80), so givers know what size to buy and what matters most.

-- Sizes, by kind: tops, bottoms, dresses, shoes, rings, bras, other.
-- Validated in the app (src/lib/sizes.ts); capped here as a backstop.
alter table public.profiles
  add column sizes jsonb not null default '{}'::jsonb
  check (jsonb_typeof(sizes) = 'object' and pg_column_size(sizes) < 2000);

-- Per list: show the owner's sizes on its share page. On by default.
alter table public.wishlists
  add column show_sizes boolean not null default true;

-- What the share page needs beyond get_shared_wishlist(): sizes (or null when
-- the list hides them) and, per visible item, its type and category (to pick
-- the matching size) and whether it's rated 5 stars. Only that yes/no is
-- shared; other ratings stay private. Same token-gated, SECURITY DEFINER
-- pattern as get_shared_wishlist() (ARCHITECTURE.md, "Public Wishlist
-- Sharing").
create function public.get_shared_list_extras(token uuid)
returns jsonb as $$
  select jsonb_build_object(
    'sizes', case when w.show_sizes then p.sizes end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'item_type', t.name,
        'category', c.name,
        'most_wanted', coalesce(i.interest_level, 0) = 5
      ))
      from public.wishlist_items wi
      join public.items i
        on i.id = wi.item_id and not i.purchased and not i.gifted
      join public.item_types t on t.id = i.item_type_id
      join public.categories c on c.id = t.category_id
      where wi.wishlist_id = w.id
    ), '[]'::jsonb)
  )
  from public.wishlists w
  left join public.profiles p on p.id = w.user_id
  where w.share_token = token;
$$ language sql security definer stable set search_path = '';

revoke execute on function public.get_shared_list_extras(uuid) from public;
grant execute on function public.get_shared_list_extras(uuid) to anon, authenticated;
