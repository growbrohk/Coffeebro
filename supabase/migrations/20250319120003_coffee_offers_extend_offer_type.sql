-- Extend coffee_offers offer_type to allow free, $17coffee, buy1get1free
alter table public.coffee_offers
  drop constraint if exists coffee_offers_offer_type_check;

alter table public.coffee_offers
  add constraint coffee_offers_offer_type_check
  check (offer_type in ('free', '$17coffee', 'buy1get1free'));
