-- Two built-in jacket types (KAM-68): everyday and activewear jackets.
-- Skips a name that already exists, so reruns and custom types are safe.
insert into public.item_types (name, is_system, category_id)
select t.name, true, c.id
from (values ('Jackets & Coats'), ('Active Jackets')) as t(name)
join public.categories c on c.name = 'Clothing' and c.is_system
where not exists (
  select 1
  from public.item_types existing
  where existing.is_system and lower(existing.name) = lower(t.name)
);
