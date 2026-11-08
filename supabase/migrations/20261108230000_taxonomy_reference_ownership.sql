-- Custom taxonomy hardening (KAM-35).
--
-- 1. Reference ownership. The policies only checked who owns the row being
--    written, not what it points at: a user could file a custom item type
--    under someone else's custom category, or point an item at someone
--    else's custom item type (by UUID). That leaks the other user's names
--    into the joined views and, through ON DELETE RESTRICT, blocks them from
--    deleting their own category/type. Writes must now reference rows the
--    caller can see: a system row, or one of their own.
--
-- 2. Case-insensitive duplicate names. unique (user_id, name) is case-
--    sensitive and ignores system rows (user_id null), so "boots" could sit
--    next to the system "Boots". A trigger rejects a name that matches any
--    category/item type visible to that user, ignoring case.

-- Visible = system, or owned by the current user.
create function public.is_visible_category(category uuid)
returns boolean as $$
  select exists (
    select 1 from public.categories c
    where c.id = category and (c.is_system or c.user_id = auth.uid())
  );
$$ language sql stable security invoker set search_path = '';

create function public.is_visible_item_type(item_type uuid)
returns boolean as $$
  select exists (
    select 1 from public.item_types t
    where t.id = item_type and (t.is_system or t.user_id = auth.uid())
  );
$$ language sql stable security invoker set search_path = '';

drop policy "Insert own item types" on public.item_types;
create policy "Insert own item types"
  on public.item_types for insert
  with check (
    user_id = auth.uid() and is_system = false
    and public.is_visible_category(category_id)
  );

drop policy "Update own non-system item types" on public.item_types;
create policy "Update own non-system item types"
  on public.item_types for update
  using (user_id = auth.uid() and is_system = false)
  with check (
    user_id = auth.uid() and is_system = false
    and public.is_visible_category(category_id)
  );

drop policy "Users manage their own items" on public.items;
create policy "Users manage their own items"
  on public.items for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and public.is_visible_item_type(item_type_id)
  );

-- ---------------------------------------------------------------------------

create function public.reject_duplicate_taxonomy_name()
returns trigger as $$
begin
  if exists (
    select 1 from public.categories c
    where tg_table_name = 'categories'
      and c.id <> new.id
      and lower(c.name) = lower(new.name)
      and (c.user_id is null or c.user_id is not distinct from new.user_id)
  ) or exists (
    select 1 from public.item_types t
    where tg_table_name = 'item_types'
      and t.id <> new.id
      and lower(t.name) = lower(new.name)
      and (t.user_id is null or t.user_id is not distinct from new.user_id)
  ) then
    raise exception 'A % named "%" already exists.',
      case tg_table_name when 'categories' then 'category' else 'item type' end,
      new.name
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';
-- SECURITY DEFINER so the check can see every system row and the user's
-- own rows regardless of RLS; it only ever compares names and never
-- returns data.

create trigger categories_reject_duplicate_name
  before insert or update of name, user_id on public.categories
  for each row execute function public.reject_duplicate_taxonomy_name();

create trigger item_types_reject_duplicate_name
  before insert or update of name, user_id on public.item_types
  for each row execute function public.reject_duplicate_taxonomy_name();
