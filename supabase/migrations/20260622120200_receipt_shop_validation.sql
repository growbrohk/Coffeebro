-- Receipt shop validation: merchant name aliases + upsert RPC + order_no parsing for global receipt keys.

-- 1) shop_loyalty_settings.receipt_match_names
alter table public.shop_loyalty_settings
  add column if not exists receipt_match_names text[] not null default '{}';

comment on column public.shop_loyalty_settings.receipt_match_names is
  'Extra names printed on receipts (legal entity, POS name). org_name is always included automatically.';

-- 2) upsert_shop_loyalty_settings — include receipt_match_names
drop function if exists public.upsert_shop_loyalty_settings(uuid, int);

create or replace function public.upsert_shop_loyalty_settings(
  p_org_id uuid,
  p_cents_per_point int,
  p_receipt_match_names text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_names text[];
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), p_org_id)
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_cents_per_point is null or p_cents_per_point < 1 then
    raise exception 'INVALID_CENTS_PER_POINT' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct btrim(n)), '{}')
  into v_names
  from unnest(coalesce(p_receipt_match_names, '{}')) as n
  where btrim(n) <> '';

  insert into public.shop_loyalty_settings (org_id, cents_per_point, receipt_match_names)
  values (p_org_id, p_cents_per_point, coalesce(v_names, '{}'))
  on conflict (org_id) do update
  set cents_per_point = excluded.cents_per_point,
      receipt_match_names = excluded.receipt_match_names,
      updated_at = now();
end;
$$;

grant execute on function public.upsert_shop_loyalty_settings(uuid, int, text[]) to authenticated;

-- 3) finalize_receipt_scan — order_no from global or legacy receipt_key format
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

  -- Legacy key: orgId|orderNo|date. Global key: orderNo|date|totalCents.
  v_order_no := nullif(trim(
    case
      when split_part(p_receipt_key, '|', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' then split_part(p_receipt_key, '|', 2)
      else split_part(p_receipt_key, '|', 1)
    end
  ), '');

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

-- 4) get_loyalty_activity_feed — order_no from column, not receipt_key position
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
        'order_no', coalesce(
          c.order_no,
          case
            when split_part(c.receipt_key, '|', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' then nullif(trim(split_part(c.receipt_key, '|', 2)), '')
            else nullif(trim(split_part(c.receipt_key, '|', 1)), '')
          end
        ),
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
