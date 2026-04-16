-- Public org profile: editable description + RPC for any org (bypasses RLS for discovery-only cafés).

alter table public.orgs
  add column if not exists description text;

comment on column public.orgs.description is 'Public-facing blurb shown on the consumer org profile page.';

create or replace function public.get_public_org_by_id(p_org_id uuid)
returns table (
  id uuid,
  org_name text,
  location text,
  lat double precision,
  lng double precision,
  preview_photo_url text,
  logo_url text,
  opening_hours jsonb,
  google_maps_url text,
  district text,
  mtr_station text,
  hk_area text,
  description text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.org_name,
    o.location,
    o.lat,
    o.lng,
    o.preview_photo_url,
    o.logo_url,
    o.opening_hours,
    o.google_maps_url,
    o.district,
    o.mtr_station,
    o.hk_area,
    o.description
  from public.orgs o
  where o.id = p_org_id;
$$;

comment on function public.get_public_org_by_id(uuid) is 'Security definer: public-safe org fields for the consumer org profile (any org id).';

grant execute on function public.get_public_org_by_id(uuid) to anon;
grant execute on function public.get_public_org_by_id(uuid) to authenticated;
