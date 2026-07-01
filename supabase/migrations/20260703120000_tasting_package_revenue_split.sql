-- Package revenue split: coffee shop % on tasting packages, snapshot on purchase,
-- tab-aware tracking summary, and per-redemption shop split column.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.tasting_packages
  add column if not exists coffee_shop_split_pct numeric(5, 4) not null default 0.6000;

alter table public.tasting_packages
  drop constraint if exists tasting_packages_coffee_shop_split_pct_check;

alter table public.tasting_packages
  add constraint tasting_packages_coffee_shop_split_pct_check
  check (coffee_shop_split_pct > 0 and coffee_shop_split_pct <= 1);

alter table public.tasting_package_purchases
  add column if not exists coffee_shop_split_pct numeric(5, 4);

update public.tasting_package_purchases p
set coffee_shop_split_pct = coalesce(tp.coffee_shop_split_pct, 0.6000)
from public.tasting_packages tp
where tp.id = p.package_id
  and p.coffee_shop_split_pct is null;

-- ---------------------------------------------------------------------------
-- Tab-aware admin tracking summary
-- ---------------------------------------------------------------------------
create or replace function public.get_tasting_tracking_summary(
  p_filters jsonb default '{}'::jsonb,
  p_tab text default 'purchases'
)
returns table (
  packages_sold bigint,
  revenue_cents bigint,
  profit_cents bigint,
  vouchers_total bigint,
  vouchers_redeemed bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id uuid;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_buyer_search text;
  v_sold bigint := 0;
  v_revenue bigint := 0;
  v_profit bigint := 0;
  v_vouchers_total bigint := 0;
  v_vouchers_redeemed bigint := 0;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_package_id := nullif(p_filters->>'package_id', '')::uuid;
  v_date_from := nullif(p_filters->>'date_from', '')::timestamptz;
  v_date_to := nullif(p_filters->>'date_to', '')::timestamptz;
  v_buyer_search := nullif(trim(p_filters->>'buyer_search'), '');

  if p_tab = 'purchases' then
    select
      count(*)::bigint,
      coalesce(sum(p.amount_cents), 0)::bigint,
      coalesce(
        round(
          sum(
            p.amount_cents::numeric
            * (1 - coalesce(p.coffee_shop_split_pct, tp.coffee_shop_split_pct, 0.6000))
          )
        ),
        0
      )::bigint
    into v_sold, v_revenue, v_profit
    from public.tasting_package_purchases p
    join public.tasting_packages tp on tp.id = p.package_id
    left join public.profiles pr on pr.user_id = p.user_id
    left join auth.users au on au.id = p.user_id
    where p.status in ('paid', 'minted')
      and (v_package_id is null or p.package_id = v_package_id)
      and (v_date_from is null or p.created_at >= v_date_from)
      and (v_date_to is null or p.created_at <= v_date_to)
      and (
        v_buyer_search is null
        or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
        or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
      );
  elsif p_tab = 'redemptions' then
    select count(*)::bigint
    into v_vouchers_redeemed
    from public.vouchers v
    join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
    left join public.profiles pr on pr.user_id = p.user_id
    left join auth.users au on au.id = p.user_id
    where v.tasting_package_purchase_id is not null
      and v.status = 'redeemed'
      and v.redeemed_at is not null
      and p.status in ('paid', 'minted')
      and (v_package_id is null or p.package_id = v_package_id)
      and (v_date_from is null or v.redeemed_at >= v_date_from)
      and (v_date_to is null or v.redeemed_at <= v_date_to)
      and (
        v_buyer_search is null
        or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
        or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
      );

    select count(*)::bigint
    into v_vouchers_total
    from public.vouchers v
    join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
    left join public.profiles pr on pr.user_id = p.user_id
    left join auth.users au on au.id = p.user_id
    where v.tasting_package_purchase_id is not null
      and p.status in ('paid', 'minted')
      and (v_package_id is null or p.package_id = v_package_id)
      and (
        v_buyer_search is null
        or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
        or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
      );
  else
    raise exception 'INVALID_TAB' using errcode = 'P0001';
  end if;

  return query select v_sold, v_revenue, v_profit, v_vouchers_total, v_vouchers_redeemed;
end;
$$;

grant execute on function public.get_tasting_tracking_summary(jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin redemption list with shop split column
-- ---------------------------------------------------------------------------
drop function if exists public.list_tasting_redemptions(jsonb);

create or replace function public.list_tasting_redemptions(p_filters jsonb default '{}'::jsonb)
returns table (
  voucher_id uuid,
  voucher_code text,
  buyer_id uuid,
  buyer_name text,
  buyer_email text,
  package_id uuid,
  package_title text,
  tier text,
  org_id uuid,
  shop_name text,
  menu_item_id uuid,
  item_name text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  scanned_by_name text,
  shop_split_cents int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id uuid;
  v_tier text;
  v_org_id uuid;
  v_menu_item_id uuid;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_buyer_search text;
  v_limit int;
  v_cursor_redeemed_at timestamptz;
  v_cursor_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_package_id := nullif(p_filters->>'package_id', '')::uuid;
  v_tier := nullif(p_filters->>'tier', '');
  v_org_id := nullif(p_filters->>'org_id', '')::uuid;
  v_menu_item_id := nullif(p_filters->>'menu_item_id', '')::uuid;
  v_date_from := nullif(p_filters->>'date_from', '')::timestamptz;
  v_date_to := nullif(p_filters->>'date_to', '')::timestamptz;
  v_buyer_search := nullif(trim(p_filters->>'buyer_search'), '');
  v_limit := greatest(1, least(coalesce(nullif(p_filters->>'limit', '')::int, 10), 50));
  v_cursor_redeemed_at := nullif(p_filters->>'cursor_redeemed_at', '')::timestamptz;
  v_cursor_id := nullif(p_filters->>'cursor_id', '')::uuid;

  return query
  with vc as (
    select
      v2.tasting_package_purchase_id as purchase_id,
      count(*)::bigint as voucher_count
    from public.vouchers v2
    where v2.tasting_package_purchase_id is not null
    group by v2.tasting_package_purchase_id
  )
  select
    v.id as voucher_id,
    v.code as voucher_code,
    p.user_id as buyer_id,
    coalesce(nullif(trim(pr.username), ''), 'Member') as buyer_name,
    au.email::text as buyer_email,
    p.package_id,
    tp.title as package_title,
    p.tier,
    v.org_id,
    o.org_name as shop_name,
    v.menu_item_id,
    public._tasting_voucher_item_name(v.menu_item_id, v.menu_item_id_2) as item_name,
    v.status,
    v.created_at,
    v.redeemed_at,
    coalesce(nullif(trim(rp.username), ''), null)::text as scanned_by_name,
    round(
      p.amount_cents::numeric
      * coalesce(p.coffee_shop_split_pct, tp.coffee_shop_split_pct, 0.6000)
      / nullif(vc.voucher_count, 0)
    )::int as shop_split_cents
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.tasting_packages tp on tp.id = p.package_id
  join public.orgs o on o.id = v.org_id
  left join vc on vc.purchase_id = p.id
  left join public.profiles pr on pr.user_id = p.user_id
  left join auth.users au on au.id = p.user_id
  left join public.profiles rp on rp.user_id = v.redeemed_by
  where v.tasting_package_purchase_id is not null
    and v.status = 'redeemed'
    and v.redeemed_at is not null
    and p.status in ('paid', 'minted')
    and (v_package_id is null or p.package_id = v_package_id)
    and (v_tier is null or p.tier = v_tier)
    and (v_org_id is null or v.org_id = v_org_id)
    and (v_menu_item_id is null or v.menu_item_id = v_menu_item_id)
    and (v_date_from is null or v.redeemed_at >= v_date_from)
    and (v_date_to is null or v.redeemed_at <= v_date_to)
    and (
      v_buyer_search is null
      or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
      or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
    )
    and (
      v_cursor_redeemed_at is null
      or v_cursor_id is null
      or (v.redeemed_at, v.id) < (v_cursor_redeemed_at, v_cursor_id)
    )
  order by v.redeemed_at desc, v.id desc
  limit v_limit;
end;
$$;

grant execute on function public.list_tasting_redemptions(jsonb) to authenticated;
