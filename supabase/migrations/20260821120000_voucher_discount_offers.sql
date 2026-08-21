-- Discount voucher offers: percent_discount_N / dollar_discount_N, optional menu item ("Any item").

-- ---------------------------------------------------------------------------
-- 1) Nullable menu_item_id for "Any item" discount vouchers
-- ---------------------------------------------------------------------------
alter table public.campaign_vouchers
  alter column menu_item_id drop not null;

alter table public.return_voucher_presets
  alter column menu_item_id drop not null;

-- ---------------------------------------------------------------------------
-- 2) Extended offer_type checks (encoded discount amounts)
-- ---------------------------------------------------------------------------
alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_offer_type_check;

alter table public.campaign_vouchers
  add constraint campaign_vouchers_offer_type_check check (
    offer_type in (
      'free',
      'b1g1',
      'fixed_price_7',
      'fixed_price_17',
      'fixed_price_20',
      'fixed_price_27'
    )
    or offer_type ~ '^percent_discount_([1-9][0-9]?)$'
    or offer_type ~ '^dollar_discount_[1-9][0-9]*$'
  );

alter table public.return_voucher_presets
  drop constraint if exists return_voucher_presets_offer_type_check;

alter table public.return_voucher_presets
  add constraint return_voucher_presets_offer_type_check check (
    offer_type in (
      'free',
      'b1g1',
      'fixed_price_7',
      'fixed_price_17',
      'fixed_price_20',
      'fixed_price_27'
    )
    or offer_type ~ '^percent_discount_([1-9][0-9]?)$'
    or offer_type ~ '^dollar_discount_[1-9][0-9]*$'
  );

-- Only discount offers may omit menu_item_id
alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_any_item_check;

alter table public.campaign_vouchers
  add constraint campaign_vouchers_any_item_check check (
    menu_item_id is not null
    or offer_type ~ '^(percent|dollar)_discount_'
  );

alter table public.return_voucher_presets
  drop constraint if exists return_voucher_presets_any_item_check;

alter table public.return_voucher_presets
  add constraint return_voucher_presets_any_item_check check (
    menu_item_id is not null
    or offer_type ~ '^(percent|dollar)_discount_'
  );

-- ---------------------------------------------------------------------------
-- 3) Random pools: allow free + discount offers (still reject paid tiers)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_random_campaign_vouchers_free()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rm text;
begin
  select c.reward_mode
  into rm
  from public.campaigns c
  where c.id = new.campaign_id;

  if rm = 'random'
    and new.offer_type is distinct from 'free'
    and new.offer_type !~ '^(percent|dollar)_discount_'
  then
    raise exception 'RANDOM_CAMPAIGN_PAID_OFFER_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Claim pricing: discount offers are free; support null menu_item_id
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

  select cv.offer_type, mi.base_price
  into v_offer, v_base
  from public.campaign_vouchers cv
  left join public.menu_items mi on mi.id = cv.menu_item_id
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
-- 5) redeem_voucher_atomic — left join menu for any-item discount vouchers
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
      coalesce(
        nullif(trim(mi_snap.item_name), ''),
        nullif(trim(mi_preset.item_name), ''),
        'Any item'
      ),
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
      coalesce(nullif(trim(mi.item_name), ''), 'Any item'),
      cv.offer_type,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
    join public.campaigns c on c.id = v.campaign_id
    left join public.menu_items mi on mi.id = cv.menu_item_id
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
