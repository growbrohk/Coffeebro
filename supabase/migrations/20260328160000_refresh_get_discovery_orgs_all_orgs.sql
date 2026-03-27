-- Re-apply get_discovery_orgs if an older variant only returned orgs with active hunts.
-- Result set: all rows from public.orgs; hunt/treasure ids nullable.

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
  select
    o.id,
    o.org_name,
    o.preview_photo_url,
    o.location,
    o.lat,
    o.lng,
    o.district,
    o.mtr_station,
    pick.hunt_id,
    tr.treasure_id
  from public.orgs o
  left join lateral (
    select h2.id as hunt_id
    from public.hunts h2
    where h2.org_id = o.id
    order by case when h2.status = 'active' then 0 else 1 end, h2.created_at desc nulls last
    limit 1
  ) pick on true
  left join lateral (
    select t.id as treasure_id
    from public.treasures t
    where pick.hunt_id is not null
      and t.hunt_id = pick.hunt_id
    order by t.sort_order
    limit 1
  ) tr on true
  order by o.org_name;
$$;

comment on function public.get_discovery_orgs() is 'Every org row; optional sample hunt (active preferred) and treasure for deep links.';
