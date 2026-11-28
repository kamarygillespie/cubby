-- Cost per wear (KAM-85): one row per time a closet piece was worn, so undo
-- is exact and "most worn this year" (KAM-86) is a simple query.

create table public.item_wears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  -- Set when the wear was logged from an outfit, so the outfit can undo it.
  outfit_id uuid references public.outfits(id) on delete set null,
  worn_at timestamptz not null default now()
);

create index idx_item_wears_item on public.item_wears(item_id);
create index idx_item_wears_user_worn on public.item_wears(user_id, worn_at);

alter table public.item_wears enable row level security;

-- Own rows only, and the piece (and outfit, if any) must be the caller's
-- too: write policies check what a row points to (ARCHITECTURE.md).
create policy "Users read their own wears"
  on public.item_wears for select
  using (user_id = auth.uid());

create policy "Users log wears of their own pieces"
  on public.item_wears for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.items i
      where i.id = item_id and i.user_id = auth.uid()
    )
    and (
      outfit_id is null or exists (
        select 1 from public.outfits o
        where o.id = outfit_id and o.user_id = auth.uid()
      )
    )
  );

create policy "Users remove their own wears"
  on public.item_wears for delete
  using (user_id = auth.uid());

-- "Wore it" on an outfit: one wear for every piece in it, in one statement.
-- SECURITY INVOKER, so the policies above still apply.
create function public.log_outfit_wear(p_outfit_id uuid)
returns integer as $$
declare
  v_count integer;
begin
  insert into public.item_wears (item_id, outfit_id)
  select oi.item_id, oi.outfit_id
  from public.outfit_items oi
  where oi.outfit_id = p_outfit_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql security invoker set search_path = '';

-- Undo an outfit's most recent "Wore it": removes the wears logged in that
-- one go (same outfit, same moment).
create function public.undo_outfit_wear(p_outfit_id uuid)
returns integer as $$
declare
  v_count integer;
begin
  delete from public.item_wears w
  where w.outfit_id = p_outfit_id
    and w.worn_at = (
      select max(worn_at) from public.item_wears where outfit_id = p_outfit_id
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql security invoker set search_path = '';

revoke execute on function public.log_outfit_wear(uuid) from public, anon;
revoke execute on function public.undo_outfit_wear(uuid) from public, anon;
grant execute on function public.log_outfit_wear(uuid) to authenticated;
grant execute on function public.undo_outfit_wear(uuid) to authenticated;
