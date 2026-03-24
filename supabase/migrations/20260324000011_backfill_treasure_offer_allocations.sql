-- Backfill allocation rows for existing hunt offers so scanning remains compatible.
insert into public.treasure_offer_allocations (treasure_id, offer_id, sort_order, fixed_count, allocation_weight, is_active)
select
  o.treasure_id,
  o.id,
  coalesce(o.sort_order, 0),
  1,
  1,
  true
from public.offers o
where o.source_type = 'hunt'
  and o.treasure_id is not null
  and not exists (
    select 1
    from public.treasure_offer_allocations ta
    where ta.treasure_id = o.treasure_id
      and ta.offer_id = o.id
  );

