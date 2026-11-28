-- Occasion dates on wishlists (KAM-79): a countdown on the share page and a
-- reminder to send the link about 3 weeks ahead.

alter table public.wishlists
  add column occasion_date date,
  -- The occasion_date a reminder was already sent for. A changed date gets
  -- its own reminder.
  add column reminded_for date;

alter table public.notifications
  add column wishlist_id uuid references public.wishlists(id) on delete cascade;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('price_drop', 'store_sale', 'target_price', 'occasion'));

-- One reminder per list per date, once it's 21 days away or closer (so a
-- date set 10 days out gets one right away). Returns how many it created.
-- Runs from pg_cron as the database owner; not callable by app users.
create function public.create_occasion_reminders(p_today date default current_date)
returns integer as $$
declare
  v_count integer;
begin
  with due as (
    update public.wishlists w
    set reminded_for = w.occasion_date
    where w.occasion_date is not null
      and w.occasion_date between p_today and p_today + 21
      and w.reminded_for is distinct from w.occasion_date
    returning w.id, w.user_id, w.name, w.occasion_date - p_today as days
  )
  insert into public.notifications (user_id, kind, wishlist_id, title, body, url)
  select
    due.user_id,
    'occasion',
    due.id,
    due.name || case
      when due.days = 0 then ' is today'
      when due.days = 1 then ' is tomorrow'
      else ' is in ' || due.days || ' days'
    end,
    'Send your list so people have time to shop.',
    '/wishlists/' || due.id
  from due;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function public.create_occasion_reminders(date) from public, anon, authenticated;

-- Daily at 16:00 UTC, an hour before the push digest (17:00) sends it.
select cron.schedule(
  'occasion-reminders',
  '0 16 * * *',
  $$ select public.create_occasion_reminders(); $$
);

-- The share page's countdown reads the date through the token-gated extras
-- function (KAM-78). Same signature, one more field.
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
