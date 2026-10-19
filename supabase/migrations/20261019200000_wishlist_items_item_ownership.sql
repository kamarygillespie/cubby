-- wishlist_items previously only checked that the *wishlist* belonged to the
-- caller, not the *item*. A user could attach someone else's item (by UUID)
-- to their own list, and get_shared_wishlist() — SECURITY DEFINER, so it
-- bypasses items RLS — would then expose that item on the public share page.
-- Require both sides of the join to be owned by the caller.

drop policy "Users manage wishlist_items for their own wishlists"
  on public.wishlist_items;

create policy "Users manage wishlist_items for their own wishlists and items"
  on public.wishlist_items for all
  using (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );
