-- Per-user redemption cap, receipt order_no, activity feed + catalog availability RPCs.

-- ---------------------------------------------------------------------------
-- 1) vouchers_catalog.max_redemptions_per_user
-- ---------------------------------------------------------------------------
alter table public.vouchers_catalog
  add column if not exists max_redemptions_per_user int;

comment on column public.vouchers_catalog.max_redemptions_per_user is
  'When set (>=1), max lifetime redemptions of this catalog reward per user (active+redeemed vouchers). Null = unlimited per user.';

alter table public.vouchers_catalog drop constraint if exists vouchers_catalog_max_redemptions_per_user_check;
alter table public.vouchers_catalog
  add constraint vouchers_catalog_max_redemptions_per_user_check
  check (max_redemptions_per_user is null or max_redemptions_per_user >= 1);

-- ---------------------------------------------------------------------------
-- 2) coffee_receipt_claims.order_no (optional clean display)
-- ---------------------------------------------------------------------------
alter table public.coffee_receipt_claims
  add column if not exists order_no text;

comment on column public.coffee_receipt_claims.order_no is
  'Parsed order number from receipt pipeline; complements receipt_key.';

-- ---------------------------------------------------------------------------
-- 3) finalize_receipt_scan — persist order_no on claim insert
-- ---------------------------------------------------------------------------
create or replace function public.finalize_receipt_scan(
  p_org_id uuid,
  p_receipt_key text,
  p_amount_cents int,
  p_items jsonb,
  p_place text,
  p_coffee_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claim_id uuid;
  v_dc_id uuid;
  v_cents_per_point int;
  v_points int;
  v_new_balance int;
  v_order_no text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.orgs o where o.id = p_org_id) then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_receipt_key is null or length(trim(p_receipt_key)) = 0 then
    raise exception 'INVALID_RECEIPT_KEY' using errcode = 'P0001';
  end if;

  v_order_no := nullif(trim(split_part(p_receipt_key, '|', 2)), '');

  begin
    insert into public.coffee_receipt_claims (receipt_key, org_id, user_id, points_awarded, order_no)
    values (p_receipt_key, p_org_id, v_uid, 0, v_order_no)
    returning id into v_claim_id;
  exception
    when unique_violation then
      raise exception 'ALREADY_CLAIMED' using errcode = 'P0001';
  end;

  select s.cents_per_point into v_cents_per_point
  from public.shop_loyalty_settings s
  where s.org_id = p_org_id;

  if v_cents_per_point is null then
    insert into public.shop_loyalty_settings (org_id, cents_per_point)
    values (p_org_id, 100)
    on conflict (org_id) do nothing;
    select s.cents_per_point into v_cents_per_point
    from public.shop_loyalty_settings s
    where s.org_id = p_org_id;
  end if;

  if v_cents_per_point is null or v_cents_per_point < 1 then
    v_cents_per_point := 100;
  end if;

  v_points := greatest(0, floor(coalesce(p_amount_cents, 0)::numeric / v_cents_per_point)::int);

  insert into public.daily_coffees (
    user_id,
    coffee_date,
    place,
    log_item,
    log_item_other,
    tasting_notes,
    location_kind,
    org_id,
    log_type,
    share_publicly,
    receipt_amount_cents,
    receipt_line_items
  )
  values (
    v_uid,
    coalesce(p_coffee_date, (timezone('UTC', now()))::date),
    coalesce(nullif(trim(p_place), ''), 'Coffee shop'),
    null,
    null,
    null,
    'coffee_shop',
    p_org_id,
    'receipt',
    false,
    p_amount_cents,
    p_items
  )
  returning id into v_dc_id;

  update public.coffee_receipt_claims
  set points_awarded = v_points, daily_coffee_id = v_dc_id
  where id = v_claim_id;

  insert into public.loyalty_points_ledger (user_id, org_id, delta, reason, ref_id)
  values (v_uid, p_org_id, v_points, 'receipt_scan', v_claim_id);

  insert into public.loyalty_balances (user_id, org_id, balance)
  values (v_uid, p_org_id, v_points)
  on conflict (user_id, org_id) do update
  set balance = public.loyalty_balances.balance + excluded.balance,
      updated_at = now()
  returning balance into v_new_balance;

  if v_new_balance is null then
    select balance into v_new_balance from public.loyalty_balances where user_id = v_uid and org_id = p_org_id;
  end if;

  return jsonb_build_object(
    'points_awarded', v_points,
    'new_balance', coalesce(v_new_balance, v_points),
    'daily_coffee_id', v_dc_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) redeem_catalog_item — per-user cap (v_user_minted)
-- ---------------------------------------------------------------------------
create or replace function public.redeem_catalog_item(p_catalog_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cat public.vouchers_catalog%rowtype;
  v_org uuid;
  v_bal int;
  v_code text;
  v_vid uuid;
  v_minted int;
  v_user_minted int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select * into v_cat from public.vouchers_catalog where id = p_catalog_id for update;
  if not found then
    raise exception 'CATALOG_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_cat.active is not true then
    raise exception 'CATALOG_INACTIVE' using errcode = 'P0001';
  end if;

  v_org := v_cat.org_id;

  if v_cat.quantity_cap is not null then
    select count(*)::int into v_minted
    from public.vouchers v
    where v.loyalty_catalog_id = p_catalog_id
      and v.status in ('active', 'redeemed');
    if v_minted >= v_cat.quantity_cap then
      raise exception 'CATALOG_SOLD_OUT' using errcode = 'P0001';
    end if;
  end if;

  if v_cat.max_redemptions_per_user is not null then
    select count(*)::int into v_user_minted
    from public.vouchers v
    where v.owner_id = v_uid
      and v.loyalty_catalog_id = p_catalog_id
      and v.status in ('active', 'redeemed');
    if v_user_minted >= v_cat.max_redemptions_per_user then
      raise exception 'PER_USER_REDEEM_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  update public.loyalty_balances lb
  set balance = lb.balance - v_cat.points_cost,
      updated_at = now()
  where lb.user_id = v_uid
    and lb.org_id = v_org
    and lb.balance >= v_cat.points_cost
  returning lb.balance into v_bal;

  if not found then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
  end if;

  insert into public.loyalty_points_ledger (user_id, org_id, delta, reason, ref_id)
  values (v_uid, v_org, -v_cat.points_cost, 'catalog_redeem', p_catalog_id);

  v_code := public._generate_voucher_code();

  insert into public.vouchers (
    org_id,
    owner_id,
    code,
    status,
    loyalty_catalog_id,
    expires_at
  )
  values (
    v_org,
    v_uid,
    v_code,
    'active',
    p_catalog_id,
    now() + interval '90 days'
  )
  returning id into v_vid;

  return jsonb_build_object('id', v_vid, 'code', v_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Minted counts for active catalog items (fan UI: sold out)
-- ---------------------------------------------------------------------------
create or replace function public.get_loyalty_catalog_availability(p_org_id uuid)
returns table (
  catalog_id uuid,
  minted_all int
)
language sql
security definer
set search_path = public
as $$
  select
    vc.id as catalog_id,
    coalesce((
      select count(*)::int
      from public.vouchers v
      where v.loyalty_catalog_id = vc.id
        and v.status in ('active', 'redeemed')
    ), 0) as minted_all
  from public.vouchers_catalog vc
  where vc.org_id = p_org_id
    and vc.active = true;
$$;

grant execute on function public.get_loyalty_catalog_availability(uuid) to authenticated;

comment on function public.get_loyalty_catalog_availability(uuid) is
  'Total minted loyalty vouchers per active catalog item (for sold-out UI).';

-- ---------------------------------------------------------------------------
-- 6) Activity feed for signed-in user
-- ---------------------------------------------------------------------------
create or replace function public.get_loyalty_activity_feed(
  p_org_id uuid,
  p_limit int default 50
)
returns table (
  kind text,
  occurred_at timestamptz,
  delta int,
  title text,
  detail_json jsonb,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if v_uid is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    l.reason::text as kind,
    l.created_at as occurred_at,
    l.delta,
    case l.reason
      when 'receipt_scan' then coalesce(dc.place, o.org_name, 'Receipt')
      when 'catalog_redeem' then coalesce(vc.title, 'Reward')
      else l.reason
    end as title,
    case l.reason
      when 'receipt_scan' then jsonb_build_object(
        'claim_id', c.id,
        'receipt_amount_cents', dc.receipt_amount_cents,
        'receipt_line_items', dc.receipt_line_items,
        'coffee_date', dc.coffee_date,
        'created_at', dc.created_at,
        'place', dc.place,
        'order_no', coalesce(c.order_no, nullif(trim(split_part(c.receipt_key, '|', 2)), '')),
        'org_location', o.location,
        'org_district', o.district,
        'org_name', o.org_name
      )
      when 'catalog_redeem' then jsonb_build_object(
        'catalog_id', l.ref_id,
        'points_cost', abs(l.delta),
        'voucher_code', vpick.code
      )
      else jsonb_build_object()
    end as detail_json,
    l.id as ledger_id
  from public.loyalty_points_ledger l
  left join public.coffee_receipt_claims c
    on l.reason = 'receipt_scan' and c.id = l.ref_id
  left join public.daily_coffees dc
    on c.daily_coffee_id is not null and dc.id = c.daily_coffee_id
  left join public.orgs o
    on o.id = p_org_id
  left join public.vouchers_catalog vc
    on l.reason = 'catalog_redeem' and vc.id = l.ref_id
  left join lateral (
    select v.code
    from public.vouchers v
    where l.reason = 'catalog_redeem'
      and v.owner_id = v_uid
      and v.loyalty_catalog_id = l.ref_id
    order by abs(extract(epoch from (v.created_at - l.created_at))), v.created_at
    limit 1
  ) vpick on true
  where l.user_id = v_uid
    and l.org_id = p_org_id
    and l.reason in ('receipt_scan', 'catalog_redeem')
  order by l.created_at desc
  limit v_lim;
end;
$$;

grant execute on function public.get_loyalty_activity_feed(uuid, int) to authenticated;

comment on function public.get_loyalty_activity_feed(uuid, int) is
  'PayMe-style activity list: receipt + redeem rows for the caller in one org.';
