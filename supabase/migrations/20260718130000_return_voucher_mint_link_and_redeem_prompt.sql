-- Return voucher: link minted voucher to source redemption + redeem prompt prefill.
-- Apply after 20260718120000_return_voucher_presets (do not re-run that migration).

-- ---------------------------------------------------------------------------
-- 1) Deterministic link: minted return voucher → source redeemed voucher
-- ---------------------------------------------------------------------------
alter table public.vouchers
  add column if not exists minted_from_voucher_id uuid
  references public.vouchers(id) on delete set null;

create index if not exists idx_vouchers_minted_from_voucher_id
  on public.vouchers(minted_from_voucher_id)
  where minted_from_voucher_id is not null;

-- ---------------------------------------------------------------------------
-- 2) Mint helper — record source redemption
-- ---------------------------------------------------------------------------
drop function if exists public._mint_return_voucher_for_owner(uuid, uuid);

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
    minted_from_voucher_id,
    status,
    expires_at
  ) values (
    v_code,
    v_preset.org_id,
    p_owner_id,
    v_preset.id,
    v_preset.menu_item_id,
    p_source_voucher_id,
    'active',
    v_expires
  );

  return v_code;
end;
$$;

comment on function public._mint_return_voucher_for_owner(uuid, uuid, uuid) is
  'Mint one return voucher from a preset pool to p_owner_id. Returns code or null if pool exhausted.';

-- ---------------------------------------------------------------------------
-- 3) redeem_voucher_atomic — pass source voucher id when minting
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
-- 4) Redeem prompt prefill — return voucher minted for this redemption
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
    coalesce(nullif(trim(mi_rv.item_name), ''), nullif(trim(mi_rvp.item_name), '')) as return_voucher_item_name
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
  left join public.menu_items mi_rv on mi_rv.id = rv.menu_item_id
  left join public.menu_items mi_rvp on mi_rvp.id = rvp.menu_item_id
  where v.id = p_voucher_id
    and v.owner_id = auth.uid();
$$;

comment on function public.get_voucher_log_prefill(uuid) is
  'Returns voucher org + menu details for the current owner, plus minted return voucher info when applicable.';

grant execute on function public.get_voucher_log_prefill(uuid) to authenticated;
