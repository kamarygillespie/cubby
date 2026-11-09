-- Favorite stores (KAM-49). Stores themselves aren't a table — they're the
-- store/brand values on your items, matched case-insensitively (store_key,
-- see lib/stores.ts storeKey). This only records which ones you starred and
-- an optional link to their sale page (a link, never scraped).
create table public.favorite_stores (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_key text not null check (store_key = lower(btrim(store_key)) and store_key <> ''),
  display_name text not null,
  sale_url text check (sale_url is null or sale_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  primary key (user_id, store_key)
);

alter table public.favorite_stores enable row level security;

create policy "Users manage their own favorite stores"
  on public.favorite_stores for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
