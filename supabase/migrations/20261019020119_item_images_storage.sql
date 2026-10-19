-- ============================================================
-- ITEM IMAGES STORAGE
-- ============================================================
-- Public bucket: item images need to be viewable with no login on
-- shared wishlist pages (see get_shared_wishlist in the initial
-- schema), so reads are public by design, not an oversight.
-- Writes are restricted per-user via a path convention of
-- `{user_id}/{filename}` enforced through storage.objects RLS.
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "Item images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'item-images');

create policy "Users upload item images into their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update their own item images"
  on storage.objects for update
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own item images"
  on storage.objects for delete
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
