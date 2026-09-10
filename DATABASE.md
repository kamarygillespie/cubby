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

create policy "Insert own item types"
  on public.item_types for insert
  with check (user_id = auth.uid() and is_system = false);

create policy "Update own non-system item types"
  on public.item_types for update
  using (user_id = auth.uid() and is_system = false);

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

create policy "Users manage their own items"
  on public.items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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

create policy "Users manage wishlist_items for their own wishlists"
  on public.wishlist_items for all
  using (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  );


-- ============================================================
-- PUBLIC SHARING (no-login read access via token)
-- ============================================================
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
  join public.wishlist_items wi on wi.wishlist_id = w.id
  join public.items i on i.id = wi.item_id
  where w.share_token = token;
$$ language sql security definer stable;

-- Exposed deliberately via a SECURITY DEFINER function rather than opening
-- table-level anon SELECT policies — keeps the "no login to view" feature
-- from becoming a broader data leak surface.
grant execute on function public.get_shared_wishlist(uuid) to anon;
```

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
