alter table public.menu_items
  drop constraint if exists menu_items_category_check;

alter table public.menu_items
  add constraint menu_items_category_check check (
    category in (
      'coffee',
      'non_coffee_drinks',
      'pastry',
      'dessert',
      'food',
      'other'
    )
  );
