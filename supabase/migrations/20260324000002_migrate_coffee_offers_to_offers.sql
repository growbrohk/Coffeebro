-- Migrate coffee_offers to offers (preserve id for voucher migration)
insert into public.offers (
  id,
  source_type,
  org_id,
  name,
  offer_type,
  description,
  quantity_limit,
  location,
  coffee_types,
  created_by,
  event_date,
  event_time,
  redeem_before_time
)
select
  id,
  'calendar',
  org_id,
  name,
  offer_type,
  description,
  coalesce(quantity_limit, 17),
  location,
  coffee_types,
  created_by,
  event_date,
  event_time,
  redeem_before_time
from public.coffee_offers
on conflict (id) do nothing;
