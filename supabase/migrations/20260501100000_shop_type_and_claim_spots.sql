-- Shop type, claim spots, and campaign claim spot wiring.
--   * Adds orgs.shop_type ('physical' | 'online'), default 'physical'.
--   * Creates public.org_claim_spots for online (and optionally physical) orgs to expose
--     pickup locations independent of the main org address.
--   * Adds campaigns.claim_spot_id with cross-org enforcement trigger.
--   * Refreshes get_public_org_by_id / get_discovery_orgs to surface shop_type.

-- 1) orgs.shop_type ------------------------------------------------------------
alter table public.orgs
  add column if not exists shop_type text not null default 'physical';

alter table public.orgs
  drop constraint if exists orgs_shop_type_check;

alter table public.orgs
  add constraint orgs_shop_type_check
  check (shop_type in ('physical', 'online'));

comment on column public.orgs.shop_type is
  'physical: storefront with org-level address/coords; online: no storefront, uses public.org_claim_spots for pickup locations.';

-- 2) org_claim_spots -----------------------------------------------------------
create table if not exists public.org_claim_spots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  label text not null,
  address text,
  lat double precision,
  lng double precision,
  google_maps_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_claim_spots_label_nonblank check (length(btrim(label)) > 0),
  constraint org_claim_spots_lat_finite check (lat is null or (lat between -90 and 90)),
  constraint org_claim_spots_lng_finite check (lng is null or (lng between -180 and 180))
);

create index if not exists idx_org_claim_spots_org_id on public.org_claim_spots(org_id);
create index if not exists idx_org_claim_spots_sort on public.org_claim_spots(org_id, sort_order, created_at);

drop trigger if exists trg_org_claim_spots_set_updated_at on public.org_claim_spots;
create trigger trg_org_claim_spots_set_updated_at
  before update on public.org_claim_spots
  for each row execute function public.set_updated_at();

alter table public.org_claim_spots enable row level security;

-- Staff (owner/host/manager via can_manage_org_offers, plus super_admin) can read + CUD.
drop policy if exists "org_claim_spots_select_staff" on public.org_claim_spots;
create policy "org_claim_spots_select_staff"
  on public.org_claim_spots for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

drop policy if exists "org_claim_spots_insert_staff" on public.org_claim_spots;
create policy "org_claim_spots_insert_staff"
  on public.org_claim_spots for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

drop policy if exists "org_claim_spots_update_staff" on public.org_claim_spots;
create policy "org_claim_spots_update_staff"
  on public.org_claim_spots for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

drop policy if exists "org_claim_spots_delete_staff" on public.org_claim_spots;
create policy "org_claim_spots_delete_staff"
  on public.org_claim_spots for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

-- 3) campaigns.claim_spot_id ---------------------------------------------------
-- Added before the public (anon/authed) policies below so those policies can
-- reference campaigns.claim_spot_id without hitting 42703 during first-run.
alter table public.campaigns
  add column if not exists claim_spot_id uuid references public.org_claim_spots(id) on delete set null;

create index if not exists idx_campaigns_claim_spot_id on public.campaigns(claim_spot_id);

-- Public (anon + authenticated) can read spots referenced by a published campaign,
-- mirroring the published-campaign anon read policies (orgs/menu_items/campaign_vouchers).
drop policy if exists "org_claim_spots_select_anon_published" on public.org_claim_spots;
create policy "org_claim_spots_select_anon_published"
  on public.org_claim_spots for select
  to anon
  using (
    exists (
      select 1
      from public.campaigns c
      where c.claim_spot_id = org_claim_spots.id
        and c.status = 'published'
    )
  );

drop policy if exists "org_claim_spots_select_authed_published" on public.org_claim_spots;
create policy "org_claim_spots_select_authed_published"
  on public.org_claim_spots for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaigns c
      where c.claim_spot_id = org_claim_spots.id
        and c.status = 'published'
    )
  );

-- Trigger: claim_spot must belong to the same org as the campaign (check
-- constraints can't reference other tables).
create or replace function public.campaigns_claim_spot_same_org_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spot_org uuid;
begin
  if new.claim_spot_id is null then
    return new;
  end if;

  select s.org_id into v_spot_org
  from public.org_claim_spots s
  where s.id = new.claim_spot_id;

  if v_spot_org is null then
    raise exception 'CLAIM_SPOT_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  if v_spot_org <> new.org_id then
    raise exception 'CLAIM_SPOT_WRONG_ORG: claim_spot_id % belongs to org %, not %',
      new.claim_spot_id, v_spot_org, new.org_id
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaigns_claim_spot_same_org on public.campaigns;
create trigger trg_campaigns_claim_spot_same_org
  before insert or update of claim_spot_id, org_id on public.campaigns
  for each row execute function public.campaigns_claim_spot_same_org_fn();

-- 4) Refresh get_public_org_by_id (returns shop_type) --------------------------
drop function if exists public.get_public_org_by_id(uuid);

create function public.get_public_org_by_id(p_org_id uuid)
returns table (
  id uuid,
  org_name text,
  shop_type text,
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
    o.shop_type,
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

comment on function public.get_public_org_by_id(uuid) is
  'Security definer: public-safe org fields including shop_type for the consumer org profile.';

grant execute on function public.get_public_org_by_id(uuid) to anon;
grant execute on function public.get_public_org_by_id(uuid) to authenticated;

-- 5) Refresh get_discovery_orgs (returns shop_type) ----------------------------
drop function if exists public.get_discovery_orgs();

create function public.get_discovery_orgs()
returns table (
  id uuid,
  org_name text,
  shop_type text,
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
    o.shop_type,
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

comment on function public.get_discovery_orgs() is
  'Every org row with shop_type plus an optional sample published campaign id; clients filter online shops out of pure coffee-shop pins.';

grant execute on function public.get_discovery_orgs() to anon;
grant execute on function public.get_discovery_orgs() to authenticated;
