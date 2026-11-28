-- Return windows on purchased items (KAM-83): a "return by" date and a
-- reminder 3 days before it.

alter table public.items
  add column return_by date,
  -- The return_by a reminder was already sent for.
  add column return_reminded_for date;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('price_drop', 'store_sale', 'target_price', 'occasion', 'return_by'));

-- Same as the initial schema, plus: un-purchasing (Mark returned, or just
-- unticking) clears the return window, since there's nothing left to return.
create or replace function public.sync_purchased_date()
returns trigger as $$
begin
  if new.purchased = true and old.purchased = false then
    new.purchased_date := now();
  elsif new.purchased = false and old.purchased = true then
    new.purchased_date := null;
    new.return_by := null;
    new.return_reminded_for := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- One reminder per return date, once it's 3 days away or closer (so a date
-- set 2 days out gets one right away). Returns how many it created. Runs
-- from pg_cron; not callable by app users.
create function public.create_return_reminders(p_today date default current_date)
returns integer as $$
declare
  v_count integer;
begin
  with due as (
    update public.items i
    set return_reminded_for = i.return_by
    where i.purchased
      and i.return_by is not null
      and i.return_by between p_today and p_today + 3
      and i.return_reminded_for is distinct from i.return_by
    returning i.id, i.user_id, i.title, i.return_by - p_today as days
  )
  insert into public.notifications (user_id, kind, item_id, title, body, url)
  select
    due.user_id,
    'return_by',
    due.id,
    'Last chance to return ' || due.title,
    case
      when due.days = 0 then 'The return window closes today.'
      when due.days = 1 then 'The return window closes tomorrow.'
      else 'The return window closes in ' || due.days || ' days.'
    end,
    '/?view=purchased'
  from due;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function public.create_return_reminders(date) from public, anon, authenticated;

-- Daily at 16:00 UTC with the occasion reminders, before the 17:00 digest.
select cron.schedule(
  'return-reminders',
  '0 16 * * *',
  $$ select public.create_return_reminders(); $$
);
