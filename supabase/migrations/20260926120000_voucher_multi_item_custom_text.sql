-- Multi-item and custom-text scopes on campaign vouchers and return presets.

-- ---------------------------------------------------------------------------
-- 1) Columns
-- ---------------------------------------------------------------------------
alter table public.return_voucher_presets
  add column if not exists menu_item_ids uuid[] not null default '{}',
  add column if not exists custom_item_text text;

alter table public.campaign_vouchers
  add column if not exists menu_item_ids uuid[] not null default '{}',
  add column if not exists custom_item_text text;

alter table public.return_voucher_presets
  drop constraint if exists return_voucher_presets_custom_item_text_check;
alter table public.return_voucher_presets
  add constraint return_voucher_presets_custom_item_text_check check (
    custom_item_text is null
    or (
      char_length(trim(custom_item_text)) between 1 and 80
      and custom_item_text = trim(custom_item_text)
    )
  );

alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_custom_item_text_check;
alter table public.campaign_vouchers
  add constraint campaign_vouchers_custom_item_text_check check (
    custom_item_text is null
    or (
      char_length(trim(custom_item_text)) between 1 and 80
      and custom_item_text = trim(custom_item_text)
    )
  );

alter table public.return_voucher_presets
  drop constraint if exists return_voucher_presets_any_item_check;
alter table public.return_voucher_presets
  add constraint return_voucher_presets_any_item_check check (
    (
      (menu_item_id is not null)::int
      + (cardinality(menu_item_ids) > 0)::int
      + (custom_item_text is not null)::int
    ) <= 1
    and (
      menu_item_id is not null
      or cardinality(menu_item_ids) > 0
      or custom_item_text is not null
      or offer_type ~ '^(percent|dollar)_discount_'
    )
  );

alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_any_item_check;
alter table public.campaign_vouchers
  add constraint campaign_vouchers_any_item_check check (
    (
      (menu_item_id is not null)::int
      + (cardinality(menu_item_ids) > 0)::int
      + (custom_item_text is not null)::int
    ) <= 1
    and (
      menu_item_id is not null
      or cardinality(menu_item_ids) > 0
      or custom_item_text is not null
      or offer_type ~ '^(percent|dollar)_discount_'
    )
  );

alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_b1g1_custom_text_check;
alter table public.campaign_vouchers
  add constraint campaign_vouchers_b1g1_custom_text_check check (
    not (offer_type = 'b1g1' and custom_item_text is not null)
  );

-- ---------------------------------------------------------------------------
-- 2) Org-scoped menu_item_ids trigger
-- ---------------------------------------------------------------------------
create or replace function public.enforce_voucher_menu_item_ids_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_org_id uuid;
  v_bad int;
begin
  if new.menu_item_ids is null or cardinality(new.menu_item_ids) = 0 then
    return new;
  end if;

  if tg_table_name = 'return_voucher_presets' then
    v_org_id := new.org_id;
  else
    select c.org_id into v_org_id
    from public.campaigns c
    where c.id = new.campaign_id;
  end if;

  select count(*)::int into v_bad
  from unnest(new.menu_item_ids) as mid
  left join public.menu_items mi on mi.id = mid
  where mi.id is null or mi.org_id is distinct from v_org_id;

  if v_bad > 0 then
    raise exception 'MENU_ITEM_ORG_MISMATCH' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_return_voucher_presets_menu_item_ids_org on public.return_voucher_presets;
create trigger trg_return_voucher_presets_menu_item_ids_org
  before insert or update of menu_item_ids, org_id
  on public.return_voucher_presets
  for each row execute function public.enforce_voucher_menu_item_ids_org();

drop trigger if exists trg_campaign_vouchers_menu_item_ids_org on public.campaign_vouchers;
create trigger trg_campaign_vouchers_menu_item_ids_org
  before insert or update of menu_item_ids, campaign_id
  on public.campaign_vouchers
  for each row execute function public.enforce_voucher_menu_item_ids_org();

-- ---------------------------------------------------------------------------
-- 3) Shared label helper
-- ---------------------------------------------------------------------------
create or replace function public.voucher_item_label(
  p_menu_item_id uuid,
  p_menu_item_ids uuid[],
  p_custom_item_text text
)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(trim(p_custom_item_text), ''),
    (
      select string_agg(mi.item_name, ', ' order by mi.item_name)
      from public.menu_items mi
      where mi.id = any(coalesce(p_menu_item_ids, '{}'::uuid[]))
    ),
    (select mi.item_name from public.menu_items mi where mi.id = p_menu_item_id),
    'Any item'
  );
$$;

comment on function public.voucher_item_label(uuid, uuid[], text) is
  'Customer-facing item label: custom text, then multi-item names, then single item, then Any item.';

grant execute on function public.voucher_item_label(uuid, uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Buy 1 get 1 claim price uses the highest selected item price
-- ---------------------------------------------------------------------------
create or replace function public.compute_campaign_claim_amount_cents(p_campaign_id uuid)
returns table (amount_cents int, requires_payment boolean, currency text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.campaigns%rowtype;
  v_offer text;
  v_base numeric(10, 2);
  v_digits text;
  v_cents int;
begin
  currency := 'hkd';

  select * into c from public.campaigns where id = p_campaign_id;
  if not found then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if c.reward_mode = 'random' then
    amount_cents := 0;
    requires_payment := false;
    return next;
    return;
  end if;

  select
    cv.offer_type,
    (
      select max(mi.base_price)
      from public.menu_items mi
      where mi.id = cv.menu_item_id
         or mi.id = any(coalesce(cv.menu_item_ids, '{}'::uuid[]))
    )
  into v_offer, v_base
  from public.campaign_vouchers cv
  where cv.campaign_id = p_campaign_id
  order by cv.sort_order, cv.created_at
  limit 1;

  if v_offer is null then
    raise exception 'NO_VOUCHER_DEFINITION' using errcode = 'P0001';
  end if;

  if v_offer = 'free' then
    amount_cents := 0;
    requires_payment := false;
    return next;
    return;
  end if;

  if v_offer ~ '^(percent|dollar)_discount_' then
    amount_cents := 0;
    requires_payment := false;
    return next;
    return;
  end if;

  if v_offer = 'b1g1' then
    v_cents := round(coalesce(v_base, 0) * 100)::int;
    if v_cents <= 0 then
      raise exception 'INVALID_B1G1_PRICE' using errcode = 'P0001';
    end if;
    amount_cents := v_cents;
    requires_payment := true;
    return next;
    return;
  end if;

  v_digits := substring(v_offer from 'fixed_price_(\d+)');
  if v_digits is null then
    raise exception 'UNKNOWN_OFFER_TYPE' using errcode = 'P0001';
  end if;

  v_cents := (v_digits::int) * 100;
  amount_cents := v_cents;
  requires_payment := true;
  return next;
end;
$$;

revoke all on function public.compute_campaign_claim_amount_cents(uuid) from public;
grant execute on function public.compute_campaign_claim_amount_cents(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5) redeem_voucher_atomic — use voucher_item_label
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
      public.voucher_item_label(
        coalesce(v.menu_item_id, rvp.menu_item_id),
        rvp.menu_item_ids,
        rvp.custom_item_text
      ),
      rvp.offer_type,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.return_voucher_presets rvp on rvp.id = v.return_voucher_preset_id
    join public.orgs o on o.id = v.org_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;

  elsif v_voucher.tasting_package_item_id is not null then
    select tps.return_voucher_preset_id into v_preset_id
    from public.tasting_package_items tpi
    join public.tasting_package_shops tps on tps.id = tpi.package_shop_id
    where tpi.id = v_voucher.tasting_package_item_id;

    if v_preset_id is not null then
      v_return_code := public._mint_return_voucher_for_owner(v_preset_id, v_voucher.owner_id, v_voucher.id);
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
      v_return_code := public._mint_return_voucher_for_owner(v_preset_id, v_voucher.owner_id, v_voucher.id);
      v_return_minted := v_return_code is not null;
    end if;

    select
      o.org_name,
      c.display_title,
      public.voucher_item_label(cv.menu_item_id, cv.menu_item_ids, cv.custom_item_text),
      cv.offer_type,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
    join public.campaigns c on c.id = v.campaign_id
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
-- 6) Prefill, public wallet, participants
-- ---------------------------------------------------------------------------
drop function if exists public.get_voucher_log_prefill(uuid);

create function public.get_voucher_log_prefill(p_voucher_id uuid)
returns table (
  voucher_id uuid,
  org_id uuid,
  org_name text,
  menu_item_id uuid,
  menu_item_name text,
  redeemed_at timestamptz,
  return_voucher_sent boolean,
  return_voucher_offer_type text,
  return_voucher_item_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id as voucher_id,
    v.org_id,
    o.org_name,
    mi.id as menu_item_id,
    mi.item_name as menu_item_name,
    coalesce(v.redeemed_at, now()) as redeemed_at,
    (rv.id is not null) as return_voucher_sent,
    rvp.offer_type as return_voucher_offer_type,
    public.voucher_item_label(
      coalesce(rv.menu_item_id, rvp.menu_item_id),
      rvp.menu_item_ids,
      rvp.custom_item_text
    ) as return_voucher_item_name
  from public.vouchers v
  left join public.orgs o on o.id = v.org_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join public.menu_items mi on mi.id = cv.menu_item_id
  left join lateral (
    select rv_inner.id, rv_inner.return_voucher_preset_id, rv_inner.menu_item_id
    from public.vouchers rv_inner
    where rv_inner.minted_from_voucher_id = v.id
    limit 1
  ) rv on true
  left join public.return_voucher_presets rvp on rvp.id = rv.return_voucher_preset_id
  where v.id = p_voucher_id
    and v.owner_id = auth.uid();
$$;

comment on function public.get_voucher_log_prefill(uuid) is
  'Returns voucher org + menu details for the current owner, plus minted return voucher info when applicable.';

grant execute on function public.get_voucher_log_prefill(uuid) to authenticated;

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
    case
      when cv.id is not null then public.voucher_item_label(cv.menu_item_id, cv.menu_item_ids, cv.custom_item_text)
      when rvp.id is not null then public.voucher_item_label(
        coalesce(v.menu_item_id, rvp.menu_item_id),
        rvp.menu_item_ids,
        rvp.custom_item_text
      )
      else mi_loyal.item_name
    end as menu_item_name,
    coalesce(
      c.display_title,
      vc.title,
      rvp.title,
      case
        when cv.id is not null then public.voucher_item_label(cv.menu_item_id, cv.menu_item_ids, cv.custom_item_text)
        when rvp.id is not null then public.voucher_item_label(
          coalesce(v.menu_item_id, rvp.menu_item_id),
          rvp.menu_item_ids,
          rvp.custom_item_text
        )
        else mi_loyal.item_name
      end,
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
  left join public.campaigns c on c.id = coalesce(cv.campaign_id, v.campaign_id)
  left join public.org_claim_spots cs on cs.id = c.claim_spot_id
  left join public.vouchers_catalog vc on vc.id = v.loyalty_catalog_id
  left join public.menu_items mi_loyal on mi_loyal.id = vc.menu_item_id
  left join public.return_voucher_presets rvp on rvp.id = v.return_voucher_preset_id
  where v.owner_id = p_owner_id
  order by v.created_at desc;
end;
$$;

comment on function public.get_public_user_vouchers(uuid) is
  'Authenticated viewers: another user''s vouchers for display (no codes). Supports campaign, loyalty, and return voucher presets.';

grant execute on function public.get_public_user_vouchers(uuid) to authenticated;

drop function if exists public.list_campaign_participants(uuid);

create function public.list_campaign_participants(p_campaign_id uuid)
returns table (
  voucher_id uuid,
  owner_id uuid,
  owner_name text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  code text,
  offer_type text,
  item_name text,
  return_voucher_status text,
  return_voucher_redeemed_at timestamptz,
  return_voucher_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select c.org_id into v_org_id
  from public.campaigns c
  where c.id = p_campaign_id;

  if v_org_id is null then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.is_org_owner(auth.uid(), v_org_id)
    or public.can_scan_vouchers_for_org(auth.uid(), v_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.id as voucher_id,
    v.owner_id,
    coalesce(p.username, '') as owner_name,
    v.status,
    v.created_at,
    v.redeemed_at,
    v.code,
    cv.offer_type,
    public.voucher_item_label(cv.menu_item_id, cv.menu_item_ids, cv.custom_item_text) as item_name,
    rv.status as return_voucher_status,
    rv.redeemed_at as return_voucher_redeemed_at,
    rv.expires_at as return_voucher_expires_at
  from public.vouchers v
  left join public.profiles p on p.user_id = v.owner_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join lateral (
    select rv_inner.status, rv_inner.redeemed_at, rv_inner.expires_at
    from public.vouchers rv_inner
    where rv_inner.minted_from_voucher_id = v.id
    order by rv_inner.created_at desc
    limit 1
  ) rv on true
  where v.campaign_id = p_campaign_id
  order by v.created_at asc;
end;
$$;

grant execute on function public.list_campaign_participants(uuid) to authenticated;
