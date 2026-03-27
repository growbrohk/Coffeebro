-- Discovery, geo, and contact fields for organizations; super_admin can update orgs.

alter table public.orgs
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists instagram_handle text,
  add column if not exists phone text,
  add column if not exists google_maps_url text,
  add column if not exists opening_hours jsonb,
  add column if not exists hk_area text,
  add column if not exists district text,
  add column if not exists mtr_station text;

alter table public.orgs
  drop constraint if exists orgs_hk_area_check;

alter table public.orgs
  add constraint orgs_hk_area_check check (
    hk_area is null
    or hk_area in ('hk_island', 'kowloon', 'new_territories')
  );

comment on column public.orgs.opening_hours is 'Weekly hours JSON, e.g. mon..sun with closed/open/close';

create policy "Super admins can update orgs"
on public.orgs
for update
to authenticated
using (public.has_role(auth.uid(), 'super_admin'))
with check (public.has_role(auth.uid(), 'super_admin'));
