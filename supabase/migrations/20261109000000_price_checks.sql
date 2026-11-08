-- Price history + automatic daily price checks (KAM-43).

alter table public.items add column price_checked_at timestamptz;

-- One row per price check (manual "Check price" or the scheduled job).
-- Prices are what the page said; `unreadable` rows have null prices. This
-- history is what V4 price-drop notifications build on.
create table public.item_price_checks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'unreadable')),
  price numeric(10,2),
  sale_price numeric(10,2)
);

create index idx_item_price_checks_item on public.item_price_checks(item_id, checked_at desc);
create index idx_items_price_check_due on public.items(price_checked_at)
  where link is not null and not purchased and not gifted;

alter table public.item_price_checks enable row level security;

create policy "Users see price checks for their own items"
  on public.item_price_checks for select
  using (user_id = auth.uid());

-- Inserts only via record_price_check() as the item's owner (or the
-- service-role scheduled job, which bypasses RLS by design).
create policy "Users record price checks for their own items"
  on public.item_price_checks for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );

-- The single write path for a price check, used by both the manual action
-- and the scheduled job, so the rules live in one place:
--   * always log the check and stamp price_checked_at;
--   * only a readable page (a price was found) changes the item's prices —
--     a failed read never wipes a known price;
--   * a sale price only counts when it's lower than the price; otherwise
--     (incl. missing) the sale is over and sale_price is cleared.
-- SECURITY INVOKER: callers can only record checks for items RLS lets them
-- see/update.
create function public.record_price_check(
  p_item_id uuid,
  p_price numeric,
  p_sale_price numeric
) returns void as $$
declare
  v_user_id uuid;
  v_sale numeric := case when p_sale_price < p_price then p_sale_price end;
begin
  select user_id into v_user_id from public.items where id = p_item_id;
  if v_user_id is null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  insert into public.item_price_checks (item_id, user_id, status, price, sale_price)
  values (
    p_item_id, v_user_id,
    case when p_price is null then 'unreadable' else 'ok' end,
    p_price, v_sale
  );

  update public.items
  set price_checked_at = now(),
      price = coalesce(p_price, price),
      sale_price = case when p_price is null then sale_price else v_sale end
  where id = p_item_id;
end;
$$ language plpgsql security invoker set search_path = '';

revoke execute on function public.record_price_check(uuid, numeric, numeric) from public, anon;
grant execute on function public.record_price_check(uuid, numeric, numeric) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Schedule: hourly, the daily-price-check Edge Function checks items not
-- checked in ~20h — about once a day per item, load spread across the day,
-- each run well inside the Edge Function time limit.
--
-- The function URL and its shared secret come from Vault (set once per
-- project; never committed). Until they exist — e.g. local dev — the job is
-- a no-op. See ARCHITECTURE.md "Sale Detection".
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'daily-price-checks',
  '23 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/daily-price-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'price_check_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'price_check_cron_secret');
  $$
);
