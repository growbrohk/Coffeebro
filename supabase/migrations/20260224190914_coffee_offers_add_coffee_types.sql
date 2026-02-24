alter table public.coffee_offers
add column if not exists coffee_types text[] null;
