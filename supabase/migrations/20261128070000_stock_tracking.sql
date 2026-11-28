-- Stock tracking (KAM-75): price checks also read availability, for the
-- size in the item's notes when the page lists sizes. A restock creates a
-- "back in stock" alert.

alter table public.items
  add column in_stock boolean,
  -- The size in_stock is about ("m"), or null when it's the item overall.
  add column stock_size text check (char_length(stock_size) <= 20);

alter table public.item_price_checks
  add column in_stock boolean;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('price_drop', 'store_sale', 'target_price', 'occasion',
                  'return_by', 'budget', 'back_in_stock'));

-- Same as 20261109000000_price_checks, plus stock. The new parameters have
-- defaults, so callers that only send prices (the live app and function
-- during a deploy) keep working. A readable page sets stock to what it says
-- (null = the page doesn't say); an unreadable one leaves it alone.
drop function public.record_price_check(uuid, numeric, numeric);
create function public.record_price_check(
  p_item_id uuid,
  p_price numeric,
  p_sale_price numeric,
  p_in_stock boolean default null,
  p_stock_size text default null
) returns void as $$
declare
  v_user_id uuid;
  v_sale numeric := case when p_sale_price < p_price then p_sale_price end;
begin
  select user_id into v_user_id from public.items where id = p_item_id;
  if v_user_id is null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  insert into public.item_price_checks (item_id, user_id, status, price, sale_price, in_stock)
  values (
    p_item_id, v_user_id,
    case when p_price is null then 'unreadable' else 'ok' end,
    p_price, v_sale, p_in_stock
  );

  update public.items
  set price_checked_at = now(),
      price = coalesce(p_price, price),
      sale_price = case when p_price is null then sale_price else v_sale end,
      in_stock = case when p_price is null then in_stock else p_in_stock end,
      stock_size = case when p_price is null then stock_size
                        else left(p_stock_size, 20) end
  where id = p_item_id;
end;
$$ language plpgsql security invoker set search_path = '';

revoke execute on function public.record_price_check(uuid, numeric, numeric, boolean, text) from public, anon;
grant execute on function public.record_price_check(uuid, numeric, numeric, boolean, text) to authenticated, service_role;

-- notify_price_change() as of 20261128010000, plus the back-in-stock rule.
-- The trigger also fires on in_stock changes now (still only on a check).
create or replace function public.notify_price_change() returns trigger as $$
declare
  v_settings public.notification_settings;
  v_old numeric := coalesce(old.sale_price, old.price);
  v_new numeric := coalesce(new.sale_price, new.price);
  v_pct numeric;
  v_key text;
  v_store text;
  v_hit_target boolean := false;
begin
  if new.purchased or new.gifted or new.source <> 'wishlist' then
    return new;
  end if;

  if new.target_price is not null and v_new is not null
     and v_new <= new.target_price
     and (v_old is null or v_old > new.target_price) then
    v_hit_target := true;
    insert into public.notifications (user_id, kind, item_id, price, title, body, url)
    values (
      new.user_id, 'target_price', new.id, v_new,
      new.title || ' hit your target price',
      'Now $' || to_char(v_new, 'FM999,999,990.00') ||
        ' (your target: $' || to_char(new.target_price, 'FM999,999,990.00') || ').',
      '/items/' || new.id || '/edit'
    );
  end if;

  select * into v_settings from public.notification_settings
  where user_id = new.user_id;
  if not found then
    v_settings.price_drops := true;
    v_settings.store_sales := true;
    v_settings.min_drop_percent := 10;
  end if;

  if not v_hit_target and v_settings.price_drops and v_old > 0 and v_new < v_old then
    v_pct := round((v_old - v_new) / v_old * 100);
    if v_pct >= v_settings.min_drop_percent and not exists (
      select 1 from public.notifications n
      where n.item_id = new.id and n.kind = 'price_drop'
        and n.created_at > now() - interval '7 days'
        and n.price <= v_new
    ) then
      insert into public.notifications (user_id, kind, item_id, price, title, body, url)
      values (
        new.user_id, 'price_drop', new.id, v_new,
        new.title || ' dropped to $' || to_char(v_new, 'FM999,999,990.00'),
        'Was $' || to_char(v_old, 'FM999,999,990.00') || ' — ' || v_pct || '% less.',
        '/items/' || new.id || '/edit'
      );
    end if;
  end if;

  v_key := lower(regexp_replace(btrim(coalesce(new.store_brand, '')), '\s+', ' ', 'g'));
  if v_settings.store_sales and v_key <> ''
     and old.sale_price is null and new.sale_price is not null then
    select f.display_name into v_store from public.favorite_stores f
    where f.user_id = new.user_id and f.store_key = v_key;
    if found and not exists (
      select 1 from public.notifications n
      where n.user_id = new.user_id and n.kind = 'store_sale'
        and n.store_key = v_key
        and n.created_at > now() - interval '7 days'
    ) then
      insert into public.notifications (user_id, kind, item_id, store_key, title, body, url)
      values (
        new.user_id, 'store_sale', new.id, v_key,
        v_store || ' is having a sale',
        new.title || ' is ' || round((new.price - new.sale_price) / new.price * 100) || '% off.',
        '/?store=' || replace(v_key, ' ', '%20')
      );
    end if;
  end if;

  -- Back in stock (KAM-75): sold out at the last check, buyable now, for
  -- the same size (a changed size in the notes isn't a restock).
  if old.in_stock is false and new.in_stock is true
     and coalesce(old.stock_size, '') = coalesce(new.stock_size, '') then
    insert into public.notifications (user_id, kind, item_id, title, body, url)
    values (
      new.user_id, 'back_in_stock', new.id,
      new.title || ' is back in stock',
      case when new.stock_size is not null
        then 'Available again in size ' || upper(new.stock_size) || '.'
        else 'Available to buy again.' end,
      '/items/' || new.id || '/edit'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = '';


drop trigger items_notify_price_change on public.items;
create trigger items_notify_price_change
  after update of price, sale_price, price_checked_at, in_stock on public.items
  for each row
  when (new.price_checked_at is distinct from old.price_checked_at)
  execute function public.notify_price_change();


-- The share page shows "Sold out in M" so givers don't pick something they
-- can't buy. Same function as 20261128020000, plus each item's stock.
create or replace function public.get_shared_list_extras(token uuid)
returns jsonb as $$
  select jsonb_build_object(
    'sizes', case when w.show_sizes then p.sizes end,
    'occasion_date', w.occasion_date,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'item_type', t.name,
        'category', c.name,
        'most_wanted', coalesce(i.interest_level, 0) = 5,
        'in_stock', i.in_stock,
        'stock_size', i.stock_size
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
