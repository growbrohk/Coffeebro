-- Return voucher presets: optional fixed redemption window (Hong Kong calendar).
-- Both dates null = days after claim. Snapshotted onto the minted voucher.

-- ---------------------------------------------------------------------------
-- 1) Preset dates + voucher snapshot
-- ---------------------------------------------------------------------------
alter table public.return_voucher_presets
  add column if not exists redeem_starts_on date,
  add column if not exists redeem_ends_on date;

alter table public.return_voucher_presets
  drop constraint if exists return_voucher_presets_redeem_window_check;
alter table public.return_voucher_presets
  add constraint return_voucher_presets_redeem_window_check check (
    (redeem_starts_on is null and redeem_ends_on is null)
    or (
      redeem_starts_on is not null
      and redeem_ends_on is not null
      and redeem_ends_on >= redeem_starts_on
    )
  );

comment on column public.return_voucher_presets.redeem_starts_on is
  'Hong Kong calendar start of a fixed redemption window. Null with redeem_ends_on means days-after-claim.';
comment on column public.return_voucher_presets.redeem_ends_on is
  'Hong Kong calendar last day of a fixed redemption window. Null with redeem_starts_on means days-after-claim.';

alter table public.vouchers
  add column if not exists redeemable_from timestamptz;

comment on column public.vouchers.redeemable_from is
  'When set, voucher cannot be redeemed before this instant. Null means redeemable immediately.';

-- ---------------------------------------------------------------------------
-- 2) Mint — snapshot days or fixed window; skip pool if window already ended
-- ---------------------------------------------------------------------------
create or replace function public._mint_return_voucher_for_owner(
  p_preset_id uuid,
  p_owner_id uuid,
  p_source_voucher_id uuid default null
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
  v_redeemable_from timestamptz;
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

  if v_preset.redeem_starts_on is not null and v_preset.redeem_ends_on is not null then
    v_redeemable_from := v_preset.redeem_starts_on::timestamp at time zone 'Asia/Hong_Kong';
    v_expires := (v_preset.redeem_ends_on + 1)::timestamp at time zone 'Asia/Hong_Kong';
    if now() >= v_expires then
      return null;
    end if;
  else
    v_redeemable_from := null;
    v_expires := now() + make_interval(days => v_preset.redeem_valid_days);
  end if;

  select count(*)::int into v_minted
  from public.vouchers v
  where v.return_voucher_preset_id = p_preset_id;

  if v_minted >= v_preset.quantity then
    return null;
  end if;

  v_code := public._generate_voucher_code();

  insert into public.vouchers (
    code,
    org_id,
    owner_id,
    return_voucher_preset_id,
    menu_item_id,
    minted_from_voucher_id,
    status,
    expires_at,
    redeemable_from
  ) values (
    v_code,
    v_preset.org_id,
    p_owner_id,
    v_preset.id,
    v_preset.menu_item_id,
    p_source_voucher_id,
    'active',
    v_expires,
    v_redeemable_from
  );

  return v_code;
end;
$$;

comment on function public._mint_return_voucher_for_owner(uuid, uuid, uuid) is
  'Mint one return voucher from a preset pool to p_owner_id. Returns code or null if pool exhausted or fixed period already ended.';

-- ---------------------------------------------------------------------------
-- 3) Redeem — reject before redeemable_from
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

  if v_voucher.redeemable_from is not null and now() < v_voucher.redeemable_from then
    return query select
      'NOT_YET_VALID'::text, 'Redemption period has not started'::text, v_voucher.id,
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
