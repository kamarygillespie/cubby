-- Target price alerts (KAM-81): "tell me when this is $40 or less".

alter table public.items
  add column target_price numeric(10,2) check (target_price > 0);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('price_drop', 'store_sale', 'target_price'));

-- Same rules as 20261109060000_notifications, plus:
--   * target_price: the effective price crossed the item's target, i.e. it
--     was above it (or unknown) before this check and is at or below it now.
--     So it alerts once per crossing, not every day it stays low, and again
--     only after the price goes back above and drops again. It replaces the
--     price_drop alert for that check, so there's never two for one change.
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

  return new;
end;
$$ language plpgsql security definer set search_path = '';
