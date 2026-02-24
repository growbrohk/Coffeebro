alter table public.coffee_offers
add column if not exists quantity_limit integer not null default 17;
