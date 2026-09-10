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
