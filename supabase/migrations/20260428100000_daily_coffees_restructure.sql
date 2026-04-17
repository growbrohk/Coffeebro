-- daily_coffees: remove unused fields, rename drink + notes, add structured location (kind + org)

alter table public.daily_coffees
  drop column if exists rating,
  drop column if exists beans,
  drop column if exists note;

alter table public.daily_coffees
  rename column diary to tasting_notes;

alter table public.daily_coffees
  rename column coffee_type to log_item;

alter table public.daily_coffees
  rename column coffee_type_other to log_item_other;

alter table public.daily_coffees
  add column if not exists location_kind text,
  add column if not exists org_id uuid references public.orgs (id) on delete set null;

alter table public.daily_coffees
  drop constraint if exists daily_coffees_location_kind_check;

alter table public.daily_coffees
  add constraint daily_coffees_location_kind_check
  check (
    location_kind is null
    or location_kind in ('home', 'coffee_shop', 'other')
  );

create index if not exists idx_daily_coffees_org_id on public.daily_coffees (org_id);

comment on column public.daily_coffees.location_kind is 'home | coffee_shop | other';
comment on column public.daily_coffees.org_id is 'When location_kind=coffee_shop, link to orgs.id';
