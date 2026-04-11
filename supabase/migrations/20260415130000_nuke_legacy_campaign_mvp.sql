-- Coffeebro MVP Phase 1: remove legacy promo domain, add menu_items / campaigns / campaign_vouchers, reshape vouchers.
-- Not production-safe for existing data: TRUNCATE vouchers.

-- ---------------------------------------------------------------------------
-- 0) Replace discovery RPC so it does not reference hunts/treasures (dropped below)
-- ---------------------------------------------------------------------------
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
    o.logo_url,
    o.preview_photo_url,
    o.location,
    o.lat,
    o.lng,
    o.district,
    o.mtr_station,
    null::uuid as sample_hunt_id,
    null::uuid as sample_treasure_id
  from public.orgs o
  order by o.org_name;
$$;

comment on function public.get_discovery_orgs() is 'Every org row; hunt/treasure samples removed (MVP campaigns).';

grant execute on function public.get_discovery_orgs() to anon;
grant execute on function public.get_discovery_orgs() to authenticated;

-- ---------------------------------------------------------------------------
-- 1) Drop RPCs that depend on legacy tables
-- ---------------------------------------------------------------------------
drop function if exists public.list_offer_participants(uuid) cascade;
drop function if exists public.mint_voucher_atomic(uuid, text) cascade;
drop function if exists public.claim_treasure_atomic(text) cascade;
drop function if exists public.get_active_treasures(uuid) cascade;

-- ---------------------------------------------------------------------------
-- 2) Truncate vouchers and remove legacy FKs / columns / indexes
-- ---------------------------------------------------------------------------
truncate table public.vouchers;

alter table public.vouchers
  drop constraint if exists vouchers_offer_id_fkey,
  drop constraint if exists vouchers_coffee_offer_id_fkey,
  drop constraint if exists vouchers_treasure_reward_id_fkey,
  drop constraint if exists vouchers_hunt_claim_id_fkey;

drop index if exists public.uq_vouchers_offer_owner;
drop index if exists public.idx_vouchers_offer_id;

alter table public.vouchers
  drop column if exists offer_id,
  drop column if exists coffee_offer_id,
  drop column if exists treasure_reward_id,
  drop column if exists hunt_claim_id,
  drop column if exists source_type,
  drop column if exists selected_coffee_type;

-- ---------------------------------------------------------------------------
-- 3) Drop legacy tables (order: children first)
-- ---------------------------------------------------------------------------
drop table if exists public.treasure_offer_allocations cascade;
drop table if exists public.hunt_claims cascade;
drop table if exists public.hunt_participants cascade;
drop table if exists public.treasures cascade;
drop table if exists public.hunts cascade;
drop table if exists public.offers cascade;
drop table if exists public.preset_offers cascade;

-- ---------------------------------------------------------------------------
-- 4) menu_items
-- ---------------------------------------------------------------------------
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete restrict,
  item_name text not null,
  category text not null,
  base_price numeric(10, 2) not null,
  temperature_option text not null,
  fulfillment_option text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_category_check check (
    category in ('coffee', 'non_coffee_drinks', 'pastry', 'dessert', 'food')
  ),
  constraint menu_items_temperature_check check (
    temperature_option in ('hot', 'iced', 'both', 'n_a')
  ),
  constraint menu_items_fulfillment_check check (
    fulfillment_option in ('dine_in', 'takeaway', 'both')
  ),
  constraint menu_items_status_check check (status in ('active', 'hidden'))
);

create index idx_menu_items_org_id on public.menu_items(org_id);

alter table public.menu_items enable row level security;

create policy "menu_items_select_authenticated"
  on public.menu_items for select
  to authenticated
  using (true);

create policy "menu_items_insert_staff"
  on public.menu_items for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy "menu_items_update_staff"
  on public.menu_items for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy "menu_items_delete_staff"
  on public.menu_items for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete restrict,
  display_title text,
  campaign_type text not null,
  start_at timestamptz,
  end_at timestamptz,
  reward_mode text not null,
  reward_per_action integer not null default 1,
  treasure_location_type text not null default 'shop',
  treasure_lat double precision,
  treasure_lng double precision,
  treasure_address text,
  treasure_area_name text,
  hint_text text,
  hint_image_url text,
  status text not null default 'draft',
  qr_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_type_check check (campaign_type in ('grab', 'hunt')),
  constraint campaigns_reward_mode_check check (reward_mode in ('fixed', 'random')),
  constraint campaigns_reward_per_action_check check (reward_per_action between 1 and 10),
  constraint campaigns_treasure_loc_check check (treasure_location_type in ('shop', 'custom')),
  constraint campaigns_status_check check (status in ('draft', 'published', 'ended')),
  constraint campaigns_grab_shop_check check (
    campaign_type <> 'grab' or treasure_location_type = 'shop'
  )
);

create unique index uq_campaigns_qr_payload on public.campaigns(qr_payload) where qr_payload is not null;
create index idx_campaigns_org_id on public.campaigns(org_id);
create index idx_campaigns_status on public.campaigns(status);

alter table public.campaigns enable row level security;

create policy "campaigns_select_authenticated"
  on public.campaigns for select
  to authenticated
  using (true);

create policy "campaigns_insert_staff"
  on public.campaigns for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy "campaigns_update_staff"
  on public.campaigns for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy "campaigns_delete_staff"
  on public.campaigns for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6) campaign_vouchers
-- ---------------------------------------------------------------------------
create table public.campaign_vouchers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  offer_type text not null,
  redeem_valid_days integer not null default 7,
  quantity integer not null,
  temperature_rule text not null,
  fulfillment_rule text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_vouchers_offer_type_check check (
    offer_type in ('free', 'b1g1', 'fixed_price_17')
  ),
  constraint campaign_vouchers_redeem_days_check check (redeem_valid_days between 1 and 90),
  constraint campaign_vouchers_quantity_check check (quantity >= 1),
  constraint campaign_vouchers_temp_rule_check check (
    temperature_rule in ('all_supported', 'hot_only', 'iced_only', 'n_a')
  ),
  constraint campaign_vouchers_fulfill_rule_check check (
    fulfillment_rule in ('all_supported', 'dine_in_only', 'takeaway_only')
  )
);

create index idx_campaign_vouchers_campaign_id on public.campaign_vouchers(campaign_id);
create index idx_campaign_vouchers_menu_item_id on public.campaign_vouchers(menu_item_id);

-- Fixed reward mode: at most one voucher row per campaign
create or replace function public.enforce_single_voucher_for_fixed_campaign()
returns trigger
language plpgsql
as $$
declare
  v_mode text;
  v_existing int;
begin
  select c.reward_mode into v_mode
  from public.campaigns c
  where c.id = new.campaign_id;

  if v_mode = 'fixed' then
    select count(*)::int into v_existing
    from public.campaign_vouchers cv
    where cv.campaign_id = new.campaign_id;

    if v_existing >= 1 then
      raise exception 'FIXED_MODE_SINGLE_VOUCHER';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaign_vouchers_fixed_single on public.campaign_vouchers;
create trigger trg_campaign_vouchers_fixed_single
  before insert on public.campaign_vouchers
  for each row execute function public.enforce_single_voucher_for_fixed_campaign();

alter table public.campaign_vouchers enable row level security;

create policy "campaign_vouchers_select_authenticated"
  on public.campaign_vouchers for select
  to authenticated
  using (true);

create policy "campaign_vouchers_insert_staff"
  on public.campaign_vouchers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (
          public.has_role(auth.uid(), 'super_admin')
          or public.can_manage_org_offers(auth.uid(), c.org_id)
        )
    )
  );

create policy "campaign_vouchers_update_staff"
  on public.campaign_vouchers for update
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (
          public.has_role(auth.uid(), 'super_admin')
          or public.can_manage_org_offers(auth.uid(), c.org_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (
          public.has_role(auth.uid(), 'super_admin')
          or public.can_manage_org_offers(auth.uid(), c.org_id)
        )
    )
  );

create policy "campaign_vouchers_delete_staff"
  on public.campaign_vouchers for delete
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (
          public.has_role(auth.uid(), 'super_admin')
          or public.can_manage_org_offers(auth.uid(), c.org_id)
        )
    )
  );

drop trigger if exists trg_campaign_vouchers_updated_at on public.campaign_vouchers;
create trigger trg_campaign_vouchers_updated_at
  before update on public.campaign_vouchers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7) vouchers: link to campaign model (table empty)
-- ---------------------------------------------------------------------------
alter table public.vouchers
  add column campaign_voucher_id uuid references public.campaign_vouchers(id) on delete restrict,
  add column campaign_id uuid references public.campaigns(id) on delete restrict;

alter table public.vouchers
  alter column campaign_voucher_id set not null,
  alter column campaign_id set not null;

create index idx_vouchers_campaign_voucher_id on public.vouchers(campaign_voucher_id);
create index idx_vouchers_campaign_id on public.vouchers(campaign_id);
