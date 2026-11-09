-- Price-drop and favorite-store-sale notifications (KAM-54).
--
-- Alerts are created in the database by a trigger on the price-check update
-- of an item, so the rules sit next to record_price_check(). A daily job
-- (send-push-digest Edge Function) pushes one digest per user to their
-- subscribed devices. The in-app list (/notifications) shows them all, so a
-- missed push loses nothing. See ARCHITECTURE.md "Notifications".

-- Per-user preferences. No row = the defaults (both alerts on, 10%).
create table public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  price_drops boolean not null default true,
  store_sales boolean not null default true,
  min_drop_percent integer not null default 10
    check (min_drop_percent between 1 and 90),
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy "Users manage their own notification settings"
  on public.notification_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- One row per device that turned on push. The endpoint is the push
-- service's URL for that browser install; it's unique, because a device
-- belongs to whoever enabled push on it most recently (see
-- save_push_subscription).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users see their own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "Users remove their own push subscriptions"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- Saving goes through this function, not a plain insert: if the device was
-- subscribed under another account (a shared phone, after a log out), the
-- old row must go, and RLS can't let one user delete another's row.
-- Knowing the endpoint proves you're on that device — it's an unguessable
-- URL only that browser receives. SECURITY DEFINER for exactly that delete.
create function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
) returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id <> auth.uid();
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- The alerts themselves. Only the trigger below creates them; users can
-- read, mark read (read_at only) and delete their own.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('price_drop', 'store_sale')),
  item_id uuid references public.items(id) on delete cascade,
  store_key text,
  -- The new effective price, for "don't alert again unless it's lower".
  price numeric(10,2),
  title text not null,
  body text not null,
  url text not null check (url like '/%'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  pushed_at timestamptz
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unpushed on public.notifications(created_at)
  where pushed_at is null;

alter table public.notifications enable row level security;

create policy "Users see their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users mark their own notifications read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete their own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

-- Column-level: the only thing a user can change is read_at.
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- The rules. Runs after record_price_check() updates an item (it always
-- stamps price_checked_at; ordinary edits don't), for active wishlist items:
--   * price_drop: the effective price (sale price, else price) fell by at
--     least the user's threshold. Not repeated for the same item within 7
--     days unless the price fell further.
--   * store_sale: a sale started on an item from one of the user's favorite
--     stores. At most one per store per 7 days ("Mejuri is having a sale").
-- SECURITY DEFINER: notifications has no insert policy, by design.
create function public.notify_price_change() returns trigger as $$
declare
  v_settings public.notification_settings;
  v_old numeric := coalesce(old.sale_price, old.price);
  v_new numeric := coalesce(new.sale_price, new.price);
  v_pct numeric;
  v_key text;
  v_store text;
begin
  if new.purchased or new.gifted or new.source <> 'wishlist' then
    return new;
  end if;

  select * into v_settings from public.notification_settings
  where user_id = new.user_id;
  if not found then
    v_settings.price_drops := true;
    v_settings.store_sales := true;
    v_settings.min_drop_percent := 10;
  end if;

  if v_settings.price_drops and v_old > 0 and v_new < v_old then
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

revoke execute on function public.notify_price_change() from public, anon, authenticated;

create trigger items_notify_price_change
  after update of price, sale_price, price_checked_at on public.items
  for each row
  when (new.price_checked_at is distinct from old.price_checked_at)
  execute function public.notify_price_change();

-- ---------------------------------------------------------------------------
-- Daily digest push, 17:00 UTC (morning on the US West Coast, afternoon on
-- the East). Same Vault secrets and no-op-until-configured pattern as the
-- price-check job in 20261109000000_price_checks.sql.
select cron.schedule(
  'daily-push-digest',
  '0 17 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-push-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'price_check_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'price_check_cron_secret');
  $$
);
