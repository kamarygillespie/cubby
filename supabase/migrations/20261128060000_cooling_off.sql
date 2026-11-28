-- Cooling-off check-in (KAM-82): "Still want these?" for older, lukewarm
-- wishlist items. Keep or Archive each; archived items leave the wishlist,
-- totals and price checks, and can be restored.

alter table public.items
  add column archived_at timestamptz,
  -- Last "Keep" in the check-in; kept items aren't asked about for 90 days.
  add column kept_at timestamptz;

-- When the owner hid this month's check-in banner.
alter table public.profiles
  add column checkin_dismissed_at timestamptz;

-- The check-in can be turned off with the other alert settings.
alter table public.notification_settings
  add column cooling_off boolean not null default true;

create index idx_items_user_archived on public.items(user_id, archived_at);
