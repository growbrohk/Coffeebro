-- Public-safe org directory for explorers: orgs that host at least one active hunt.
-- Uses security definer so consumers can read listing fields without broad orgs SELECT.

create or replace function public.get_discovery_orgs()
returns table (
  id uuid,
  org_name text,
  preview_photo_url text,
  location text,
  lat double precision,
  lng double precision,
  district text,
  mtr_station text,
  sample_hunt_id uuid,
  sample_treasure_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (o.id)
    o.id,
    o.org_name,
    o.preview_photo_url,
    o.location,
    o.lat,
    o.lng,
    o.district,
    o.mtr_station,
    h.id,
    (
      select t.id
      from public.treasures t
      where t.hunt_id = h.id
      order by t.sort_order
      limit 1
    )
  from public.orgs o
  inner join public.hunts h on h.org_id = o.id and h.status = 'active'
  order by o.id, h.created_at desc;
$$;

comment on function public.get_discovery_orgs() is 'Orgs with an active hunt; safe columns for café discovery UI.';

grant execute on function public.get_discovery_orgs() to anon;
grant execute on function public.get_discovery_orgs() to authenticated;
