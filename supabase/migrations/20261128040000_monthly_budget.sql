-- Monthly spending budget (KAM-84): progress on Totals, and alerts at 80%
-- and 100% of it.

alter table public.profiles
  add column monthly_budget numeric(10,2) check (monthly_budget > 0);

alter table public.notification_settings
  add column budget_alerts boolean not null default true;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('price_drop', 'store_sale', 'target_price', 'occasion', 'return_by', 'budget'));

-- When marking an item purchased pushes this month's spending past 80% or
-- 100% of the budget, one alert (the highest threshold crossed). At most one
-- per threshold per month. "Spent" matches Totals: purchased wishlist items
-- at the price paid. The month here is the UTC month; Totals shows the
-- viewer's own month, so the two can differ for a purchase made on the last
-- evening of a month.
create function public.notify_budget() returns trigger as $$
declare
  v_budget numeric;
  v_alerts boolean;
  v_month timestamptz := date_trunc('month', coalesce(new.purchased_date, now()));
  v_after numeric;
  v_before numeric;
  v_threshold integer;
begin
  if new.source <> 'wishlist' then
    return new;
  end if;
  select p.monthly_budget into v_budget from public.profiles p where p.id = new.user_id;
  if v_budget is null then
    return new;
  end if;
  select coalesce(s.budget_alerts, true) into v_alerts
  from public.notification_settings s where s.user_id = new.user_id;
  if v_alerts is false then
    return new;
  end if;

  select coalesce(sum(
    case when i.sale_price is not null and i.sale_price < i.price
         then i.sale_price else coalesce(i.price, 0) end
  ), 0) into v_after
  from public.items i
  where i.user_id = new.user_id
    and i.purchased and i.source = 'wishlist'
    and i.purchased_date >= v_month
    and i.purchased_date < v_month + interval '1 month';
  v_before := v_after - case
    when new.sale_price is not null and new.sale_price < new.price
    then new.sale_price else coalesce(new.price, 0) end;

  foreach v_threshold in array array[100, 80] loop
    if v_after >= v_budget * v_threshold / 100.0
       and v_before < v_budget * v_threshold / 100.0 then
      if not exists (
        select 1 from public.notifications n
        where n.user_id = new.user_id and n.kind = 'budget'
          and n.price = v_threshold
          and n.created_at >= v_month
          and n.created_at < v_month + interval '1 month'
      ) then
        insert into public.notifications (user_id, kind, price, title, body, url)
        values (
          new.user_id, 'budget', v_threshold,
          case when v_threshold = 100
            then 'You''ve reached your ' || to_char(v_month, 'FMMonth') || ' budget'
            else '80% of your ' || to_char(v_month, 'FMMonth') || ' budget'
          end,
          '$' || to_char(v_after, 'FM999,999,990.00') || ' of $' ||
            to_char(v_budget, 'FM999,999,990.00') || ' spent this month.',
          '/?view=totals'
        );
      end if;
      exit;
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function public.notify_budget() from public, anon, authenticated;

create trigger items_notify_budget
  after update of purchased on public.items
  for each row
  when (new.purchased and not old.purchased)
  execute function public.notify_budget();
