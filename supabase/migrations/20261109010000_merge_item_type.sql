-- Merge one of your own item types into another (KAM-44): move your items
-- over, then delete the duplicate — in one transaction, so a failure can't
-- leave items moved but the duplicate still there (or vice versa).
--
-- SECURITY INVOKER: RLS decides what the caller can touch. The source must be
-- the caller's own non-system type; the target must be visible (system or
-- own). Items using the source can only be the caller's own (the items
-- policy only allows visible types), so the update covers all of them.
create function public.merge_item_type(p_source uuid, p_target uuid)
returns integer as $$
declare
  v_moved integer;
begin
  if p_source = p_target then
    raise exception 'Pick a different type to merge into.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.item_types
    where id = p_source and user_id = auth.uid() and not is_system
  ) then
    raise exception 'Only your own item types can be merged.' using errcode = '42501';
  end if;

  if not public.is_visible_item_type(p_target) then
    raise exception 'That item type isn''t available.' using errcode = '42501';
  end if;

  update public.items set item_type_id = p_target where item_type_id = p_source;
  get diagnostics v_moved = row_count;

  delete from public.item_types where id = p_source;
  return v_moved;
end;
$$ language plpgsql security invoker set search_path = '';

revoke execute on function public.merge_item_type(uuid, uuid) from public, anon;
grant execute on function public.merge_item_type(uuid, uuid) to authenticated;
