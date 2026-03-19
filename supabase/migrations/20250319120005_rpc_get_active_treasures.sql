-- RPC: get_active_treasures
-- Returns treasures that are currently claimable (within time window, under claim limit)
-- p_hunt_id: specific hunt, or null for all active hunts
create or replace function public.get_active_treasures(p_hunt_id uuid default null)
returns setof public.treasures
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select t.*
  from public.treasures t
  join public.hunts h on h.id = t.hunt_id
  where h.status = 'active'
    and (p_hunt_id is null or t.hunt_id = p_hunt_id)
    and (t.starts_at is null or t.starts_at <= now())
    and (t.ends_at is null or t.ends_at >= now())
    and (
      t.claim_limit is null
      or (select count(*) from public.hunt_claims hc where hc.treasure_id = t.id) < t.claim_limit
    )
  order by t.sort_order;
end;
$$;
