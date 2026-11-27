-- Gift-givers claim items on a shared list (KAM-77), so two people don't buy
-- the same gift. Givers have no account: a random key in a browser cookie
-- identifies "my" claims so the same browser can undo them.
--
-- Givers never touch this table directly. Everything goes through the
-- SECURITY DEFINER functions below, which require the list's share token,
-- the same sanctioned bypass as get_shared_wishlist() (ARCHITECTURE.md,
-- "Public Wishlist Sharing").

create table public.item_claims (
  -- One claim per item, enforced here: two givers can't both claim it, even
  -- at the same moment.
  item_id uuid primary key references public.items(id) on delete cascade,
  -- The item's owner, copied in for RLS.
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The list it was claimed from (informational).
  wishlist_id uuid references public.wishlists(id) on delete set null,
  claimer_name text check (char_length(claimer_name) between 1 and 40),
  claimer_key uuid not null,
  created_at timestamptz not null default now()
);

create index item_claims_claimer_key_idx on public.item_claims (claimer_key);
create index item_claims_user_id_idx on public.item_claims (user_id);

alter table public.item_claims enable row level security;

-- Owners can read claims on their items (shown only with Show claims on),
-- but never the givers' keys. No insert/update/delete policies: claims are
-- written only by the functions below. An owner removes a claim by deleting
-- or buying the item.
create policy "Owners read claims on their items"
  on public.item_claims for select
  using (user_id = auth.uid());
revoke all on public.item_claims from anon, authenticated;
grant select (item_id, user_id, wishlist_id, claimer_name, created_at)
  on public.item_claims to authenticated;

-- Owner setting: off by default, so gifts stay a surprise.
alter table public.profiles
  add column show_claims boolean not null default false;

-- The item, if it's currently visible on the list with this share token
-- (on the list, not purchased, not gifted). Null otherwise.
create function public.shared_item_on_list(token uuid, p_item_id uuid)
returns table (wishlist_id uuid, owner_id uuid) as $$
  select w.id, i.user_id
  from public.wishlists w
  join public.wishlist_items wi on wi.wishlist_id = w.id
  join public.items i on i.id = wi.item_id
  where w.share_token = token
    and i.id = p_item_id
    and not i.purchased and not i.gifted;
$$ language sql security definer stable set search_path = '';
revoke execute on function public.shared_item_on_list(uuid, uuid) from public, anon, authenticated;

-- Most active claims one browser can hold, to limit abuse of a public page.
create function public.claim_shared_item(
  token uuid,
  p_item_id uuid,
  p_claimer_key uuid,
  p_name text default null
) returns text as $$
declare
  v_list uuid;
  v_owner uuid;
  v_name text := nullif(left(btrim(coalesce(p_name, '')), 40), '');
  v_existing uuid;
begin
  if token is null or p_item_id is null or p_claimer_key is null then
    return 'not_found';
  end if;
  select s.wishlist_id, s.owner_id into v_list, v_owner
  from public.shared_item_on_list(token, p_item_id) s;
  if v_list is null then
    return 'not_found';
  end if;
  -- Previewing your own list: no claiming your own gifts.
  if auth.uid() is not null and auth.uid() = v_owner then
    return 'owner';
  end if;

  select claimer_key into v_existing
  from public.item_claims where item_id = p_item_id;
  if v_existing is not null then
    return case when v_existing = p_claimer_key then 'mine' else 'taken' end;
  end if;

  if (select count(*) from public.item_claims where claimer_key = p_claimer_key) >= 25 then
    return 'limit';
  end if;

  insert into public.item_claims (item_id, user_id, wishlist_id, claimer_name, claimer_key)
  values (p_item_id, v_owner, v_list, v_name, p_claimer_key)
  on conflict (item_id) do nothing;
  -- Lost a race with another giver.
  if not found then
    return 'taken';
  end if;
  return 'claimed';
end;
$$ language plpgsql security definer volatile set search_path = '';

-- Only the browser that claimed an item can undo it.
create function public.unclaim_shared_item(
  token uuid,
  p_item_id uuid,
  p_claimer_key uuid
) returns boolean as $$
declare
  v_list uuid;
begin
  select s.wishlist_id into v_list
  from public.shared_item_on_list(token, p_item_id) s;
  if v_list is null then
    return false;
  end if;
  delete from public.item_claims
  where item_id = p_item_id and claimer_key = p_claimer_key;
  return found;
end;
$$ language plpgsql security definer volatile set search_path = '';

-- What the share page shows: which of the list's visible items are claimed,
-- and which by this browser. When the viewer is the list's owner (signed
-- in) and Show claims is off, nothing comes back, so previewing your own
-- list never spoils a surprise. Never returns names or keys.
create function public.get_shared_claims(token uuid, p_claimer_key uuid)
returns jsonb as $$
declare
  v_owner uuid;
  v_show boolean;
begin
  select w.user_id into v_owner from public.wishlists w where w.share_token = token;
  if v_owner is null then
    return null;
  end if;
  if auth.uid() is not null and auth.uid() = v_owner then
    select coalesce(p.show_claims, false) into v_show
    from public.profiles p where p.id = v_owner;
    if not coalesce(v_show, false) then
      return jsonb_build_object('owner', true, 'claims', '[]'::jsonb);
    end if;
  end if;
  return jsonb_build_object(
    'owner', auth.uid() is not null and auth.uid() = v_owner,
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', c.item_id,
        'mine', p_claimer_key is not null and c.claimer_key = p_claimer_key
      ))
      from public.item_claims c
      join public.wishlist_items wi on wi.item_id = c.item_id
      join public.wishlists w on w.id = wi.wishlist_id and w.share_token = token
    ), '[]'::jsonb)
  );
end;
$$ language plpgsql security definer stable set search_path = '';

revoke execute on function public.claim_shared_item(uuid, uuid, uuid, text) from public;
revoke execute on function public.unclaim_shared_item(uuid, uuid, uuid) from public;
revoke execute on function public.get_shared_claims(uuid, uuid) from public;
grant execute on function public.claim_shared_item(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.unclaim_shared_item(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.get_shared_claims(uuid, uuid) to anon, authenticated;
