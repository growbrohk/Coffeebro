alter table public.coffee_offers
add column if not exists redeem_before_time text null;
