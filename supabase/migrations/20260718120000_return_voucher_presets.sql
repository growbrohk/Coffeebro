-- Return voucher presets: org-level templates, optional links on campaigns / tasting shops,
-- minted to voucher owner when staff redeems a linked campaign or tasting voucher.

-- ---------------------------------------------------------------------------
-- 1) return_voucher_presets
-- ---------------------------------------------------------------------------
create table public.return_voucher_presets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete restrict,
  title text not null,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  offer_type text not null,
  redeem_valid_days integer not null default 7,
  quantity integer not null,
  temperature_rule text not null,
  fulfillment_rule text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_voucher_presets_offer_type_check check (
    offer_type in (
      'free',
      'b1g1',
      'fixed_price_7',
      'fixed_price_17',
      'fixed_price_20',
      'fixed_price_27'
    )
  ),
  constraint return_voucher_presets_redeem_days_check check (redeem_valid_days between 1 and 90),
  constraint return_voucher_presets_quantity_check check (quantity >= 1),
  constraint return_voucher_presets_temp_rule_check check (
    temperature_rule in ('all_supported', 'hot_only', 'iced_only', 'n_a')
  ),
  constraint return_voucher_presets_fulfill_rule_check check (
    fulfillment_rule in ('all_supported', 'dine_in_only', 'takeaway_only')
  ),
  constraint return_voucher_presets_title_trim check (char_length(trim(title)) >= 1)
);

create index idx_return_voucher_presets_org_id on public.return_voucher_presets(org_id);

alter table public.return_voucher_presets enable row level security;

create policy "return_voucher_presets_select_authenticated"
  on public.return_voucher_presets for select
  to authenticated
  using (true);

create policy "return_voucher_presets_insert_staff"
  on public.return_voucher_presets for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy "return_voucher_presets_update_staff"
  on public.return_voucher_presets for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy "return_voucher_presets_delete_staff"
  on public.return_voucher_presets for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

drop trigger if exists trg_return_voucher_presets_updated_at on public.return_voucher_presets;
create trigger trg_return_voucher_presets_updated_at
  before update on public.return_voucher_presets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Optional links on campaigns and tasting shops
-- ---------------------------------------------------------------------------
alter table public.campaigns
  add column return_voucher_preset_id uuid
  references public.return_voucher_presets(id) on delete set null;

create index idx_campaigns_return_voucher_preset_id
  on public.campaigns(return_voucher_preset_id)
  where return_voucher_preset_id is not null;

alter table public.tasting_package_shops
  add column return_voucher_preset_id uuid
  references public.return_voucher_presets(id) on delete set null;

create index idx_tasting_package_shops_return_voucher_preset_id
  on public.tasting_package_shops(return_voucher_preset_id)
  where return_voucher_preset_id is not null;

create or replace function public.enforce_return_voucher_preset_org_match()
returns trigger
language plpgsql
as $$
declare
  v_preset_org_id uuid;
  v_expected_org_id uuid;
begin
  if new.return_voucher_preset_id is null then
    return new;
  end if;

  select rvp.org_id into v_preset_org_id
  from public.return_voucher_presets rvp
  where rvp.id = new.return_voucher_preset_id;

  if v_preset_org_id is null then
    raise exception 'RETURN_VOUCHER_PRESET_NOT_FOUND';
  end if;

  if tg_table_name = 'campaigns' then
    v_expected_org_id := new.org_id;
  elsif tg_table_name = 'tasting_package_shops' then
    v_expected_org_id := new.org_id;
  else
    return new;
  end if;

  if v_preset_org_id <> v_expected_org_id then
    raise exception 'RETURN_VOUCHER_PRESET_ORG_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaigns_return_voucher_preset_org on public.campaigns;
create trigger trg_campaigns_return_voucher_preset_org
  before insert or update of return_voucher_preset_id, org_id on public.campaigns
  for each row execute function public.enforce_return_voucher_preset_org_match();

drop trigger if exists trg_tasting_shops_return_voucher_preset_org on public.tasting_package_shops;
create trigger trg_tasting_shops_return_voucher_preset_org
  before insert or update of return_voucher_preset_id, org_id on public.tasting_package_shops
  for each row execute function public.enforce_return_voucher_preset_org_match();

-- ---------------------------------------------------------------------------
-- 3) Minted voucher source column + source check
-- ---------------------------------------------------------------------------
alter table public.vouchers
  add column return_voucher_preset_id uuid
  references public.return_voucher_presets(id) on delete restrict;

create index idx_vouchers_return_voucher_preset_id
  on public.vouchers(return_voucher_preset_id)
  where return_voucher_preset_id is not null;

alter table public.vouchers
  drop constraint if exists vouchers_source_check;

alter table public.vouchers
  add constraint vouchers_source_check check (
    (
      campaign_id is not null
      and campaign_voucher_id is not null
      and loyalty_catalog_id is null
      and tasting_package_purchase_id is null
      and tasting_package_item_id is null
      and return_voucher_preset_id is null
    )
    or (
      loyalty_catalog_id is not null
      and campaign_id is null
      and campaign_voucher_id is null
      and tasting_package_purchase_id is null
      and tasting_package_item_id is null
      and return_voucher_preset_id is null
    )
    or (
      tasting_package_purchase_id is not null
      and tasting_package_item_id is not null
      and campaign_id is null
      and campaign_voucher_id is null
      and loyalty_catalog_id is null
      and return_voucher_preset_id is null
    )
    or (
      return_voucher_preset_id is not null
      and campaign_id is null
      and campaign_voucher_id is null
      and loyalty_catalog_id is null
      and tasting_package_purchase_id is null
      and tasting_package_item_id is null
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Mint helper
-- ---------------------------------------------------------------------------
create or replace function public._mint_return_voucher_for_owner(
  p_preset_id uuid,
  p_owner_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preset public.return_voucher_presets%rowtype;
  v_minted int;
  v_code text;
  v_expires timestamptz;
begin
  if p_preset_id is null or p_owner_id is null then
    return null;
  end if;

  select * into v_preset
  from public.return_voucher_presets rvp
  where rvp.id = p_preset_id
  for update;

  if not found then
    return null;
  end if;

  select count(*)::int into v_minted
  from public.vouchers v
  where v.return_voucher_preset_id = p_preset_id;

  if v_minted >= v_preset.quantity then
    return null;
  end if;

  v_code := public._generate_voucher_code();
  v_expires := now() + make_interval(days => v_preset.redeem_valid_days);

  insert into public.vouchers (
    code,
    org_id,
    owner_id,
    return_voucher_preset_id,
    menu_item_id,
    status,
    expires_at
  ) values (
    v_code,
    v_preset.org_id,
    p_owner_id,
    v_preset.id,
    v_preset.menu_item_id,
    'active',
    v_expires
  );

  return v_code;
end;
$$;

comment on function public._mint_return_voucher_for_owner(uuid, uuid) is
  'Mint one return voucher from a preset pool to p_owner_id. Returns code or null if pool exhausted.';

-- ---------------------------------------------------------------------------
-- 5) redeem_voucher_atomic — return voucher branch + mint on campaign/tasting redeem
-- ---------------------------------------------------------------------------
drop function if exists public.redeem_voucher_atomic(text);

create function public.redeem_voucher_atomic(p_code text)
returns table (
  status text,
  message text,
  voucher_id uuid,
  org_name text,
  campaign_title text,
  item_name text,
  offer_type text,
  voucher_code text,
  owner_id uuid,
  owner_username text,
  return_voucher_minted boolean,
  return_voucher_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher public.vouchers%rowtype;
  v_ok boolean;
  v_org_name text;
  v_campaign_title text;
  v_item_name text;
  v_offer_type text;
  v_owner_username text;
  v_redeem_date date;
  v_opening_hours jsonb;
  v_today_hkt date;
  v_preset_id uuid;
  v_return_code text;
  v_return_minted boolean := false;
begin
  if auth.uid() is null then
    return query select
      'NOT_AUTHORIZED'::text, 'Not signed in'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text,
      false, null::text;
    return;
  end if;

  select * into v_voucher from public.vouchers where code = p_code for update;

  if not found then
    return query select
      'NOT_FOUND'::text, 'Invalid code'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text,
      false, null::text;
    return;
  end if;

  v_ok := public.has_role(auth.uid(), 'super_admin')
    or public.can_scan_vouchers_for_org(auth.uid(), v_voucher.org_id);

  if not v_ok then
    return query select
      'NOT_AUTHORIZED'::text, 'Staff only'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text,
      false, null::text;
    return;
  end if;

  if v_voucher.expires_at is not null and now() > v_voucher.expires_at then
    return query select
      'EXPIRED'::text, 'Voucher expired'::text, v_voucher.id,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text,
      false, null::text;
    return;
  end if;

  if v_voucher.status <> 'active' then
    return query select
      'ALREADY_REDEEMED'::text, 'Already redeemed'::text, v_voucher.id,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text,
      false, null::text;
    return;
  end if;

  if v_voucher.tasting_package_purchase_id is not null then
    select tpp.redeem_date, o.opening_hours
    into v_redeem_date, v_opening_hours
    from public.tasting_package_purchases tpp
    join public.orgs o on o.id = v_voucher.org_id
    where tpp.id = v_voucher.tasting_package_purchase_id;

    if v_redeem_date is not null then
      v_today_hkt := (now() at time zone 'Asia/Hong_Kong')::date;

      if v_today_hkt <> v_redeem_date then
        return query select
          'NOT_REDEMPTION_DAY'::text, 'Voucher can only be redeemed on the chosen day'::text, v_voucher.id,
          null::text, null::text, null::text, null::text,
          null::text, null::uuid, null::text,
          false, null::text;
        return;
      end if;

      if not public._org_open_at(v_opening_hours, v_redeem_date, now()) then
        return query select
          'SHOP_CLOSED'::text, 'Shop is closed — check opening hours'::text, v_voucher.id,
          null::text, null::text, null::text, null::text,
          null::text, null::uuid, null::text,
          false, null::text;
        return;
      end if;
    end if;
  end if;

  update public.vouchers
  set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where id = v_voucher.id;

  v_preset_id := null;

  if v_voucher.return_voucher_preset_id is not null then
    select
      o.org_name,
      rvp.title,
      coalesce(nullif(trim(mi_snap.item_name), ''), mi_preset.item_name),
      rvp.offer_type,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.return_voucher_presets rvp on rvp.id = v.return_voucher_preset_id
    join public.orgs o on o.id = v.org_id
    left join public.menu_items mi_snap on mi_snap.id = v.menu_item_id
    left join public.menu_items mi_preset on mi_preset.id = rvp.menu_item_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;

  elsif v_voucher.tasting_package_item_id is not null then
    select tps.return_voucher_preset_id into v_preset_id
    from public.tasting_package_items tpi
    join public.tasting_package_shops tps on tps.id = tpi.package_shop_id
    where tpi.id = v_voucher.tasting_package_item_id;

    if v_preset_id is not null then
      v_return_code := public._mint_return_voucher_for_owner(v_preset_id, v_voucher.owner_id);
      v_return_minted := v_return_code is not null;
    end if;

    select
      o.org_name,
      tp.title,
      case
        when v.menu_item_id_2 is not null then
          case
            when lower(trim(coalesce(mi1.item_name, ''))) = lower(trim(coalesce(mi2.item_name, '')))
              and coalesce(trim(mi1.item_name), '') <> ''
            then trim(mi1.item_name) || ' × 2'
            else '1. ' || coalesce(nullif(trim(mi1.item_name), ''), 'Drink 1')
              || ' / 2. ' || coalesce(nullif(trim(mi2.item_name), ''), 'Drink 2')
          end
        else coalesce(nullif(trim(mi1.item_name), ''), 'Tasting drink')
      end,
      'Tasting'::text,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.orgs o on o.id = v.org_id
    left join public.menu_items mi1 on mi1.id = v.menu_item_id
    left join public.menu_items mi2 on mi2.id = v.menu_item_id_2
    left join public.tasting_package_purchases tpp on tpp.id = v.tasting_package_purchase_id
    left join public.tasting_packages tp on tp.id = tpp.package_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;

  elsif v_voucher.campaign_voucher_id is not null then
    select c.return_voucher_preset_id into v_preset_id
    from public.campaigns c
    where c.id = v_voucher.campaign_id;

    if v_preset_id is not null then
      v_return_code := public._mint_return_voucher_for_owner(v_preset_id, v_voucher.owner_id);
      v_return_minted := v_return_code is not null;
    end if;

    select
      o.org_name,
      c.display_title,
      mi.item_name,
      cv.offer_type,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
    join public.campaigns c on c.id = v.campaign_id
    join public.menu_items mi on mi.id = cv.menu_item_id
    join public.orgs o on o.id = v.org_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;

  elsif v_voucher.loyalty_catalog_id is not null then
    select
      o.org_name,
      vc.title,
      coalesce(mi.item_name, 'Loyalty reward'),
      'loyalty'::text,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.orgs o on o.id = v.org_id
    join public.vouchers_catalog vc on vc.id = v.loyalty_catalog_id
    left join public.menu_items mi on mi.id = vc.menu_item_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;

  else
    select
      o.org_name,
      null::text,
      null::text,
      null::text,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.orgs o on o.id = v.org_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;
  end if;

  return query select
    'OK'::text, 'Redeemed'::text, v_voucher.id,
    v_org_name, v_campaign_title, v_item_name, v_offer_type,
    v_voucher.code, v_voucher.owner_id, v_owner_username,
    v_return_minted, v_return_code;
end;
$$;

grant execute on function public.redeem_voucher_atomic(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Public wallet RPC
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_user_vouchers(uuid);

create function public.get_public_user_vouchers(p_owner_id uuid)
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  expires_at timestamptz,
  campaign_id uuid,
  org_id uuid,
  org_name text,
  org_logo_url text,
  org_lat double precision,
  org_lng double precision,
  org_location text,
  org_google_maps_url text,
  org_shop_type text,
  offer_type text,
  menu_item_name text,
  display_title text,
  campaign_type text,
  hint_text text,
  hint_image_url text,
  campaign_end_at timestamptz,
  claim_spot_label text,
  claim_spot_address text,
  claim_spot_lat double precision,
  claim_spot_lng double precision,
  claim_spot_google_maps_url text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if p_owner_id is null then
    raise exception 'get_public_user_vouchers: p_owner_id required';
  end if;

  return query
  select
    v.id,
    v.status,
    v.created_at,
    v.redeemed_at,
    v.expires_at,
    v.campaign_id,
    v.org_id,
    o.org_name,
    o.logo_url as org_logo_url,
    o.lat::double precision as org_lat,
    o.lng::double precision as org_lng,
    o.location as org_location,
    o.google_maps_url as org_google_maps_url,
    o.shop_type as org_shop_type,
    coalesce(cv.offer_type, rvp.offer_type, 'loyalty'::text) as offer_type,
    coalesce(mi.item_name, mi_rvp.item_name, mi_loyal.item_name) as menu_item_name,
    coalesce(
      c.display_title,
      vc.title,
      rvp.title,
      mi.item_name,
      mi_rvp.item_name,
      mi_loyal.item_name,
      'Loyalty reward'
    ) as display_title,
    coalesce(c.campaign_type, case when rvp.id is not null then 'return'::text else 'loyalty'::text end) as campaign_type,
    coalesce(c.hint_text, 'Redeem with your points at this shop.'::text) as hint_text,
    c.hint_image_url,
    c.end_at as campaign_end_at,
    cs.label as claim_spot_label,
    cs.address as claim_spot_address,
    cs.lat::double precision as claim_spot_lat,
    cs.lng::double precision as claim_spot_lng,
    cs.google_maps_url as claim_spot_google_maps_url
  from public.vouchers v
  left join public.orgs o on o.id = v.org_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join public.menu_items mi on mi.id = cv.menu_item_id
  left join public.campaigns c on c.id = coalesce(cv.campaign_id, v.campaign_id)
  left join public.org_claim_spots cs on cs.id = c.claim_spot_id
  left join public.vouchers_catalog vc on vc.id = v.loyalty_catalog_id
  left join public.menu_items mi_loyal on mi_loyal.id = vc.menu_item_id
  left join public.return_voucher_presets rvp on rvp.id = v.return_voucher_preset_id
  left join public.menu_items mi_rvp on mi_rvp.id = coalesce(v.menu_item_id, rvp.menu_item_id)
  where v.owner_id = p_owner_id
  order by v.created_at desc;
end;
$$;

comment on function public.get_public_user_vouchers(uuid) is
  'Authenticated viewers: another user''s vouchers for display (no codes). Supports campaign, loyalty, and return voucher presets.';

grant execute on function public.get_public_user_vouchers(uuid) to authenticated;
