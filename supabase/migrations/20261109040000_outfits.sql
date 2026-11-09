-- Outfit planning (KAM-48): named boards of closet pieces, optionally with a
-- photo of the outfit (a mirror selfie, an inspiration pic).

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_outfits_user on public.outfits(user_id, created_at desc);

alter table public.outfits enable row level security;

create policy "Users manage their own outfits"
  on public.outfits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (outfit_id, item_id)
);

create index idx_outfit_items_item on public.outfit_items(item_id);

alter table public.outfit_items enable row level security;

-- Both sides must be the caller's (see ARCHITECTURE.md: write policies must
-- check what a row points to — the wishlist_items/taxonomy lesson).
create policy "Users manage pieces of their own outfits"
  on public.outfit_items for all
  using (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );
