-- "Looking for" (KAM-102): things the owner wants but hasn't found a product
-- for yet ("a nice essential oil diffuser"). Separate from items, so they
-- never count toward totals, price checks or spending.

create table public.looking_for (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  notes text check (char_length(notes) <= 500),
  budget numeric(10,2) check (budget > 0),
  item_type_id uuid references public.item_types(id) on delete set null,
  -- "Found it": the wishlist item it became.
  found_item_id uuid references public.items(id) on delete set null,
  found_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_looking_for_user on public.looking_for(user_id, created_at);

alter table public.looking_for enable row level security;

-- Own rows only, and whatever a row points to must be visible to the owner
-- (a built-in or their own item type; their own item). Write policies
-- check what a row points to (ARCHITECTURE.md).
create policy "Users read their own looking-for list"
  on public.looking_for for select
  using (user_id = auth.uid());

create policy "Users add to their own looking-for list"
  on public.looking_for for insert
  with check (
    user_id = auth.uid()
    and (item_type_id is null or exists (
      select 1 from public.item_types t where t.id = item_type_id
    ))
    and (found_item_id is null or exists (
      select 1 from public.items i where i.id = found_item_id and i.user_id = auth.uid()
    ))
  );

create policy "Users update their own looking-for list"
  on public.looking_for for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (item_type_id is null or exists (
      select 1 from public.item_types t where t.id = item_type_id
    ))
    and (found_item_id is null or exists (
      select 1 from public.items i where i.id = found_item_id and i.user_id = auth.uid()
    ))
  );

create policy "Users remove from their own looking-for list"
  on public.looking_for for delete
  using (user_id = auth.uid());
