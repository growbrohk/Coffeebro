-- Replace single district with multi-select location arrays on tasting packages.

alter table public.tasting_packages
  add column hk_areas text[] not null default '{}',
  add column districts text[] not null default '{}',
  add column mtr_stations text[] not null default '{}';

update public.tasting_packages
set districts = array[district]
where district is not null and district <> '';

create index idx_tasting_packages_districts on public.tasting_packages using gin (districts);

drop index if exists idx_tasting_packages_district;

alter table public.tasting_packages drop column district;
