-- Add sample published campaign per org to discovery RPC.

drop function if exists public.get_discovery_orgs();

create function public.get_discovery_orgs()
returns table (
  id uuid,
  org_name text,
  logo_url text,
  preview_photo_url text,
  location text,
  lat double precision,
  lng double precision,
  district text,
  mtr_station text,
  sample_hunt_id uuid,
  sample_treasure_id uuid,
  sample_campaign_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.org_name,
    o.logo_url,
    o.preview_photo_url,
    o.location,
    o.lat,
    o.lng,
    o.district,
    o.mtr_station,
    null::uuid as sample_hunt_id,
    null::uuid as sample_treasure_id,
    (
      select c.id
      from public.campaigns c
      where c.org_id = o.id
        and c.status = 'published'
      order by c.updated_at desc nulls last
      limit 1
    ) as sample_campaign_id
  from public.orgs o
  order by o.org_name;
$$;

comment on function public.get_discovery_orgs() is 'Every org row with optional sample published campaign id.';

grant execute on function public.get_discovery_orgs() to anon;
grant execute on function public.get_discovery_orgs() to authenticated;
