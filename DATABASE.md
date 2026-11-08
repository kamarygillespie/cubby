# Database

Postgres via Supabase. Multi-tenant, enforced with Row Level Security. Auth is handled by Supabase's built-in `auth.users`; we extend it with a `profiles` table.

## Entity Overview

```
auth.users (Supabase-managed)
  └── profiles (1:1)
categories (system defaults + user custom)
  └── item_types (1:many, required FK to categories)
        └── items (many, required FK to item_types)
wishlists (user-owned)
  └── wishlist_items (join table: wishlists <-> items)
```

## SQL — Schema Setup

```sql
-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = system default
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "View system categories and own categories"
  on public.categories for select
  using (is_system = true or user_id = auth.uid());

create policy "Insert own categories"
  on public.categories for insert
  with check (user_id = auth.uid() and is_system = false);

create policy "Update own non-system categories"
  on public.categories for update
  using (user_id = auth.uid() and is_system = false);

create policy "Delete own non-system categories"
  on public.categories for delete
  using (user_id = auth.uid() and is_system = false);


-- ============================================================
-- ITEM TYPES
-- ============================================================
create table public.item_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = system default
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.item_types enable row level security;

create policy "View system item types and own item types"
  on public.item_types for select
  using (is_system = true or user_id = auth.uid());

-- Writes may only reference a category the caller can see (system or
-- their own): see is_visible_category below (migration 20261108230000).
create policy "Insert own item types"
  on public.item_types for insert
  with check (
    user_id = auth.uid() and is_system = false
    and public.is_visible_category(category_id)
  );

create policy "Update own non-system item types"
  on public.item_types for update
  using (user_id = auth.uid() and is_system = false)
  with check (
    user_id = auth.uid() and is_system = false
    and public.is_visible_category(category_id)
  );

create policy "Delete own non-system item types"
  on public.item_types for delete
  using (user_id = auth.uid() and is_system = false);


-- ============================================================
-- ITEMS
-- ============================================================
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  image_url text,
  link text,
  price numeric(10,2),
  sale_price numeric(10,2),
  discount_percent numeric(5,2) generated always as (
    case
      when price is not null and sale_price is not null and price > 0
        then round(((price - sale_price) / price) * 100, 2)
      else null
    end
  ) stored,
  interest_level smallint check (interest_level between 1 and 5),
  purchased boolean not null default false,
  purchased_date timestamptz,
  gifted boolean not null default false,
  notes text,
  store_brand text,
  item_type_id uuid not null references public.item_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;

-- An item may only use an item type the caller can see (system or own).
create policy "Users manage their own items"
  on public.items for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and public.is_visible_item_type(item_type_id)
  );

-- Keep purchased_date in sync with the purchased checkbox
create function public.sync_purchased_date()
returns trigger as $$
begin
  if new.purchased = true and old.purchased = false then
    new.purchased_date := now();
  elsif new.purchased = false and old.purchased = true then
    new.purchased_date := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_purchased_date
  before update on public.items
  for each row execute procedure public.sync_purchased_date();

create index idx_items_user_id on public.items(user_id);
create index idx_items_item_type_id on public.items(item_type_id);
create index idx_items_purchased on public.items(user_id, purchased);
create index idx_items_gifted on public.items(user_id, gifted);


-- ============================================================
-- WISHLISTS
-- ============================================================
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.wishlists enable row level security;

create policy "Users manage their own wishlists"
  on public.wishlists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- WISHLIST_ITEMS (join table)
-- ============================================================
create table public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (wishlist_id, item_id)
);

alter table public.wishlist_items enable row level security;

-- Both sides of the join must belong to the caller. Checking only the
-- wishlist would let a user attach someone else's item (by UUID) to their own
-- list, which get_shared_wishlist() (SECURITY DEFINER) would then expose
-- publicly. Fixed in migration 20261019200000_wishlist_items_item_ownership.
create policy "Users manage wishlist_items for their own wishlists and items"
  on public.wishlist_items for all
  using (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );


-- ============================================================
-- PUBLIC SHARING (no-login read access via token)
-- ============================================================
-- LEFT JOIN so an empty (or all-purchased) list still returns one row with
-- null item columns — distinguishable from an invalid token. Purchased/gifted
-- items are hidden: the page is for gift-givers. search_path pinned per
-- Supabase's SECURITY DEFINER guidance. (Migration 20261019210000.)
create function public.get_shared_wishlist(token uuid)
returns table (
  wishlist_name text,
  item_id uuid,
  title text,
  image_url text,
  link text,
  price numeric,
  sale_price numeric,
  notes text,
  store_brand text
) as $$
  select
    w.name,
    i.id,
    i.title,
    i.image_url,
    i.link,
    i.price,
    i.sale_price,
    i.notes,
    i.store_brand
  from public.wishlists w
  left join (
    public.wishlist_items wi
    join public.items i
      on i.id = wi.item_id and not i.purchased and not i.gifted
  ) on wi.wishlist_id = w.id
  where w.share_token = token
  order by wi.added_at desc nulls last;
$$ language sql security definer stable set search_path = '';

-- Exposed deliberately via a SECURITY DEFINER function rather than opening
-- table-level anon SELECT policies — keeps the "no login to view" feature
-- from becoming a broader data leak surface.
grant execute on function public.get_shared_wishlist(uuid) to anon;
```

## SQL — Custom Taxonomy Hardening (migration `20261108230000`)

```sql
-- "Visible" = a system row, or one owned by the caller. Used by the item_types
-- and items write policies above so nobody can reference another user's
-- custom category/type (which would leak its name and, via ON DELETE
-- RESTRICT, block its owner from deleting it).
create function public.is_visible_category(category uuid) returns boolean ...
create function public.is_visible_item_type(item_type uuid) returns boolean ...

-- Case-insensitive duplicate names: a category/item type can't share a name
-- (ignoring case) with any system row or the same user's own rows. Raises
-- unique_violation (23505), which the app turns into "You already have a …".
create function public.reject_duplicate_taxonomy_name() returns trigger ...
create trigger categories_reject_duplicate_name
  before insert or update of name, user_id on public.categories ...
create trigger item_types_reject_duplicate_name
  before insert or update of name, user_id on public.item_types ...
```

See the migration file for full bodies.

## SQL — Price Checks (migration `20261109000000`, KAM-43)

```sql
alter table public.items add column price_checked_at timestamptz;

-- One row per price check (manual "Check price" or the hourly job). status
-- 'unreadable' rows have null prices. Base for V4 price-drop alerts.
create table public.item_price_checks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'unreadable')),
  price numeric(10,2),
  sale_price numeric(10,2)
);
-- RLS: select own rows; insert only for your own items (via the function).

-- The single write path for any price check (SECURITY INVOKER): logs history,
-- stamps price_checked_at, updates price/sale_price only if a price was read
-- (never wipes a known price); a sale price that isn't lower ends the sale.
create function public.record_price_check(p_item_id uuid, p_price numeric, p_sale_price numeric) ...

-- Hourly pg_cron job → pg_net POST to the daily-price-check Edge Function,
-- reading the URL and shared secret from Vault ('project_url',
-- 'price_check_cron_secret'). A no-op until those Vault secrets exist.
select cron.schedule('daily-price-checks', '23 * * * *', $$ ... $$);
```

## SQL — Merge Item Types (migration `20261109010000`, KAM-44)

```sql
-- Merge one of your own item types into another (system or own): moves your
-- items to the target, then deletes the source, in one transaction.
-- SECURITY INVOKER; returns the number of items moved. Errors:
--   22023 merging a type into itself; 42501 source isn't your own custom
--   type, or target isn't visible to you.
create function public.merge_item_type(p_source uuid, p_target uuid) returns integer ...
```

Bulk "change type" needs no SQL: it's a plain `update items set item_type_id`
under the existing items RLS (own items only, visible types only).

## SQL — Seed Data (Default Taxonomy)

```sql
-- Categories (system defaults)
insert into public.categories (name, is_system) values
  ('Clothing', true),
  ('Shoes', true),
  ('Technology', true),
  ('Beauty', true),
  ('Misc', true);

-- Item Types (system defaults), mapped to their category
insert into public.item_types (name, is_system, category_id)
select name, true, (select id from public.categories where name = category_name)
from (values
  ('Short Sleeve Blouses & Tops', 'Clothing'),
  ('Long Sleeve Blouses & Tops', 'Clothing'),
  ('Long Sleeve Sweaters', 'Clothing'),
  ('Short Sleeve Sweaters', 'Clothing'),
  ('Sports Bras', 'Clothing'),
  ('Short Sleeve Active Tops', 'Clothing'),
  ('Long Sleeve Active Tops', 'Clothing'),
  ('Pajama Tops & Bottoms', 'Clothing'),
  ('Lounge Tops & Bottoms', 'Clothing'),
  ('Lounge Underwear', 'Clothing'),
  ('Gym Pants', 'Clothing'),
  ('Gym Tops', 'Clothing'),
  ('Skincare', 'Beauty'),
  ('Makeup', 'Beauty'),
  ('Bodycare', 'Beauty'),
  ('Haircare', 'Beauty'),
  ('Technology', 'Technology'),
  ('Flats', 'Shoes'),
  ('Boots', 'Shoes'),
  ('Sneakers', 'Shoes'),
  ('Loafers/Clogs', 'Shoes'),
  ('Earrings', 'Misc'),
  ('Bracelets', 'Misc'),
  ('Necklaces', 'Misc'),
  ('Jewelry', 'Misc'),
  ('Misc', 'Misc')
) as t(name, category_name);
```

## Local Setup

- Schema lives in `supabase/migrations/`; seed data lives in `supabase/seed.sql`. Both are applied to the project referenced in `supabase/config.toml` (project ref `xwytdthyipotuutlgkzq`).
- `npm run db:migrate` — pushes pending migrations to the linked project (`supabase db push --linked`).
- `npm run db:seed` — (re-)runs the default taxonomy seed against the linked project.
- Both commands need a Supabase personal access token available as `SUPABASE_ACCESS_TOKEN` in the shell environment (from supabase.com/dashboard/account/tokens) — it's not stored in the repo or persisted to disk.
- App-level Supabase URL/keys live in `.env.local` (gitignored, never committed).

## Notes on Design Choices

- **`discount_percent` is a generated column**, not something the app has to remember to keep in sync — it's always mathematically correct from `price`/`sale_price`.
- **`purchased_date` sync happens in a trigger**, matching the original requirement exactly: toggling `purchased` on sets the date, toggling it off clears it — this logic lives in the database, not scattered across app code.
- **`item_type_id` is required and `category` is never stored on `items`** — category is always derived via `item_types.category_id`, so it's structurally impossible for an item's category to drift out of sync with its item type.
- **System rows use `user_id IS NULL`** rather than a separate "admin" table — every user is the admin of their own custom taxonomy, which matches the multi-tenant model in `ARCHITECTURE.md`.
- **Sharing uses a `SECURITY DEFINER` function**, not a public RLS policy on the base tables — anonymous access is scoped exactly to "give me the token, get back only that wishlist's items," nothing broader.

## Future Tables (not built in V1 — noted so the design isn't blocked later)

- `closets` (V2) — references `items.id` for purchased items plus new standalone photo rows
- `outfits` / `outfit_items` (V2)
- `favorite_stores` (V2)
- `notifications` (V4)
