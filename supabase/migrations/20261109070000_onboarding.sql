-- First-run onboarding (KAM-46): when the user hid the "Get started"
-- checklist, so it stays hidden on every device. profiles' existing RLS
-- (own row only) covers it.
alter table public.profiles add column onboarding_dismissed_at timestamptz;

-- The existing update policy has no WITH CHECK; make it explicit so a row
-- can't be re-pointed at another user.
drop policy "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
