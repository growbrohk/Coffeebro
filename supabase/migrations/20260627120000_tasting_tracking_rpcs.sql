-- Tasting package purchase & redemption tracking RPCs (super admin + host ops).

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_vouchers_tasting_purchase_status
  on public.vouchers (tasting_package_purchase_id, status)
  where tasting_package_purchase_id is not null;

create index if not exists idx_vouchers_tasting_org_status
  on public.vouchers (org_id, status)
  where tasting_package_purchase_id is not null;

create index if not exists idx_tpp_package_tier_status_created
  on public.tasting_package_purchases (package_id, tier, status, created_at);

-- ---------------------------------------------------------------------------
-- Helper: frozen menu item display for tasting vouchers
-- ---------------------------------------------------------------------------
create or replace function public._tasting_voucher_item_name(
  p_menu_item_id uuid,
  p_menu_item_id_2 uuid
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_menu_item_id_2 is not null then
      case
        when lower(trim(coalesce(mi1.item_name, ''))) = lower(trim(coalesce(mi2.item_name, '')))
          and coalesce(trim(mi1.item_name), '') <> ''
        then trim(mi1.item_name) || ' × 2'
        else '1. ' || coalesce(nullif(trim(mi1.item_name), ''), 'Drink 1')
          || ' / 2. ' || coalesce(nullif(trim(mi2.item_name), ''), 'Drink 2')
      end
    else coalesce(nullif(trim(mi1.item_name), ''), 'Tasting drink')
  end
  from (select 1) _
  left join public.menu_items mi1 on mi1.id = p_menu_item_id
  left join public.menu_items mi2 on mi2.id = p_menu_item_id_2;
$$;

-- ---------------------------------------------------------------------------
-- 1a. Admin dashboard summary
-- ---------------------------------------------------------------------------
create or replace function public.get_tasting_tracking_dashboard(p_package_id uuid default null)
returns table (
  packages_sold bigint,
  total_revenue_cents bigint,
  vouchers_created bigint,
  vouchers_redeemed bigint,
  vouchers_unredeemed bigint,
  redemption_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sold bigint;
  v_revenue bigint;
  v_created bigint;
  v_redeemed bigint;
  v_unredeemed bigint;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select count(*)::bigint, coalesce(sum(p.amount_cents), 0)::bigint
  into v_sold, v_revenue
  from public.tasting_package_purchases p
  where p.status in ('paid', 'minted')
    and (p_package_id is null or p.package_id = p_package_id);

  select
    count(*)::bigint,
    count(*) filter (where v.status = 'redeemed')::bigint,
    count(*) filter (where v.status = 'active')::bigint
  into v_created, v_redeemed, v_unredeemed
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  where v.tasting_package_purchase_id is not null
    and p.status in ('paid', 'minted')
    and (p_package_id is null or p.package_id = p_package_id);

  return query select
    v_sold,
    v_revenue,
    v_created,
    v_redeemed,
    v_unredeemed,
    case when v_created > 0 then round((v_redeemed::numeric / v_created::numeric) * 100, 1) else 0 end;
end;
$$;

grant execute on function public.get_tasting_tracking_dashboard(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1a. Package sales breakdown
-- ---------------------------------------------------------------------------
create or replace function public.list_tasting_package_sales(p_package_id uuid default null)
returns table (
  package_id uuid,
  package_title text,
  tier text,
  sold bigint,
  revenue_cents bigint,
  vouchers_created bigint,
  vouchers_redeemed bigint,
  redemption_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  with sales as (
    select
      p.package_id,
      p.tier,
      count(*)::bigint as sold,
      coalesce(sum(p.amount_cents), 0)::bigint as revenue_cents
    from public.tasting_package_purchases p
    where p.status in ('paid', 'minted')
      and (p_package_id is null or p.package_id = p_package_id)
    group by p.package_id, p.tier
  ),
  voucher_stats as (
    select
      p.package_id,
      p.tier,
      count(v.id)::bigint as vouchers_created,
      count(v.id) filter (where v.status = 'redeemed')::bigint as vouchers_redeemed
    from public.vouchers v
    join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
    where v.tasting_package_purchase_id is not null
      and p.status in ('paid', 'minted')
      and (p_package_id is null or p.package_id = p_package_id)
    group by p.package_id, p.tier
  )
  select
    s.package_id,
    tp.title as package_title,
    s.tier,
    s.sold,
    s.revenue_cents,
    coalesce(vs.vouchers_created, 0)::bigint,
    coalesce(vs.vouchers_redeemed, 0)::bigint,
    case
      when coalesce(vs.vouchers_created, 0) > 0
      then round((coalesce(vs.vouchers_redeemed, 0)::numeric / vs.vouchers_created::numeric) * 100, 1)
      else 0
    end
  from sales s
  join public.tasting_packages tp on tp.id = s.package_id
  left join voucher_stats vs on vs.package_id = s.package_id and vs.tier = s.tier
  order by tp.title, s.tier;
end;
$$;

grant execute on function public.list_tasting_package_sales(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1b. Purchase list
-- ---------------------------------------------------------------------------
create or replace function public.list_tasting_purchases(p_filters jsonb default '{}'::jsonb)
returns table (
  purchase_id uuid,
  buyer_id uuid,
  buyer_name text,
  buyer_email text,
  package_id uuid,
  package_title text,
  tier text,
  amount_cents int,
  payment_status text,
  purchase_status text,
  created_at timestamptz,
  voucher_count bigint,
  redeemed_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id uuid;
  v_tier text;
  v_status text;
  v_purchase_id uuid;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_buyer_search text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_package_id := nullif(p_filters->>'package_id', '')::uuid;
  v_tier := nullif(p_filters->>'tier', '');
  v_status := nullif(p_filters->>'status', '');
  v_purchase_id := nullif(p_filters->>'purchase_id', '')::uuid;
  v_date_from := nullif(p_filters->>'date_from', '')::timestamptz;
  v_date_to := nullif(p_filters->>'date_to', '')::timestamptz;
  v_buyer_search := nullif(trim(p_filters->>'buyer_search'), '');

  return query
  with vc as (
    select
      v.tasting_package_purchase_id as purchase_id,
      count(*)::bigint as voucher_count,
      count(*) filter (where v.status = 'redeemed')::bigint as redeemed_count,
      count(*) filter (where v.status = 'active')::bigint as active_count
    from public.vouchers v
    where v.tasting_package_purchase_id is not null
    group by v.tasting_package_purchase_id
  )
  select
    p.id as purchase_id,
    p.user_id as buyer_id,
    coalesce(nullif(trim(pr.username), ''), 'Member') as buyer_name,
    au.email::text as buyer_email,
    p.package_id,
    tp.title as package_title,
    p.tier,
    p.amount_cents,
    p.status as payment_status,
    case
      when p.status = 'refunded' then 'Refunded'
      when p.status = 'failed' then 'Failed'
      when p.status in ('pending', 'paid') then 'Pending'
      when p.status = 'minted' and coalesce(vc.voucher_count, 0) > 0
        and coalesce(vc.redeemed_count, 0) = vc.voucher_count then 'Completed'
      when p.status = 'minted' then 'Active'
      else p.status
    end as purchase_status,
    p.created_at,
    coalesce(vc.voucher_count, 0)::bigint,
    coalesce(vc.redeemed_count, 0)::bigint
  from public.tasting_package_purchases p
  join public.tasting_packages tp on tp.id = p.package_id
  left join public.profiles pr on pr.user_id = p.user_id
  left join auth.users au on au.id = p.user_id
  left join vc on vc.purchase_id = p.id
  where (v_package_id is null or p.package_id = v_package_id)
    and (v_tier is null or p.tier = v_tier)
    and (v_status is null or p.status = v_status)
    and (v_purchase_id is null or p.id = v_purchase_id)
    and (v_date_from is null or p.created_at >= v_date_from)
    and (v_date_to is null or p.created_at <= v_date_to)
    and (
      v_buyer_search is null
      or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
      or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
    )
  order by p.created_at desc;
end;
$$;

grant execute on function public.list_tasting_purchases(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 1b. Vouchers for a purchase
-- ---------------------------------------------------------------------------
create or replace function public.list_tasting_purchase_vouchers(p_purchase_id uuid)
returns table (
  voucher_id uuid,
  voucher_code text,
  shop_name text,
  item_name text,
  status text,
  redeemed_at timestamptz,
  redeemed_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.id as voucher_id,
    v.code as voucher_code,
    o.org_name as shop_name,
    public._tasting_voucher_item_name(v.menu_item_id, v.menu_item_id_2) as item_name,
    v.status,
    v.redeemed_at,
    coalesce(nullif(trim(rp.username), ''), 'Staff') as redeemed_by_name
  from public.vouchers v
  join public.orgs o on o.id = v.org_id
  left join public.profiles rp on rp.user_id = v.redeemed_by
  where v.tasting_package_purchase_id = p_purchase_id
  order by o.org_name, v.created_at;
end;
$$;

grant execute on function public.list_tasting_purchase_vouchers(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1c. Redemption log
-- ---------------------------------------------------------------------------
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
  scanned_by_name text
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
  v_redemption_status text;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_buyer_search text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_package_id := nullif(p_filters->>'package_id', '')::uuid;
  v_tier := nullif(p_filters->>'tier', '');
  v_org_id := nullif(p_filters->>'org_id', '')::uuid;
  v_menu_item_id := nullif(p_filters->>'menu_item_id', '')::uuid;
  v_redemption_status := nullif(p_filters->>'redemption_status', '');
  v_date_from := nullif(p_filters->>'date_from', '')::timestamptz;
  v_date_to := nullif(p_filters->>'date_to', '')::timestamptz;
  v_buyer_search := nullif(trim(p_filters->>'buyer_search'), '');

  return query
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
    coalesce(nullif(trim(rp.username), ''), null)::text as scanned_by_name
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.tasting_packages tp on tp.id = p.package_id
  join public.orgs o on o.id = v.org_id
  left join public.profiles pr on pr.user_id = p.user_id
  left join auth.users au on au.id = p.user_id
  left join public.profiles rp on rp.user_id = v.redeemed_by
  where v.tasting_package_purchase_id is not null
    and p.status in ('paid', 'minted')
    and (v_package_id is null or p.package_id = v_package_id)
    and (v_tier is null or p.tier = v_tier)
    and (v_org_id is null or v.org_id = v_org_id)
    and (v_menu_item_id is null or v.menu_item_id = v_menu_item_id)
    and (
      v_redemption_status is null
      or (v_redemption_status = 'redeemed' and v.status = 'redeemed')
      or (v_redemption_status = 'unredeemed' and v.status = 'active')
    )
    and (
      v_date_from is null
      or coalesce(v.redeemed_at, v.created_at) >= v_date_from
    )
    and (
      v_date_to is null
      or coalesce(v.redeemed_at, v.created_at) <= v_date_to
    )
    and (
      v_buyer_search is null
      or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
      or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
    )
  order by coalesce(v.redeemed_at, v.created_at) desc;
end;
$$;

grant execute on function public.list_tasting_redemptions(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 1d. Shop summary
-- ---------------------------------------------------------------------------
create or replace function public.list_tasting_shop_summary(
  p_package_id uuid,
  p_tier text default null
)
returns table (
  org_id uuid,
  shop_name text,
  assigned_vouchers bigint,
  redeemed bigint,
  unredeemed bigint,
  redemption_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.org_id,
    o.org_name as shop_name,
    count(v.id)::bigint as assigned_vouchers,
    count(v.id) filter (where v.status = 'redeemed')::bigint as redeemed,
    count(v.id) filter (where v.status = 'active')::bigint as unredeemed,
    case
      when count(v.id) > 0
      then round((count(v.id) filter (where v.status = 'redeemed')::numeric / count(v.id)::numeric) * 100, 1)
      else 0
    end as redemption_rate
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.orgs o on o.id = v.org_id
  where v.tasting_package_purchase_id is not null
    and p.package_id = p_package_id
    and p.status in ('paid', 'minted')
    and (p_tier is null or p.tier = p_tier)
  group by v.org_id, o.org_name
  order by o.org_name;
end;
$$;

grant execute on function public.list_tasting_shop_summary(uuid, text) to authenticated;

create or replace function public.list_tasting_shop_items(
  p_package_id uuid,
  p_org_id uuid,
  p_tier text default null
)
returns table (
  menu_item_id uuid,
  item_name text,
  issued bigint,
  redeemed bigint,
  remaining bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.menu_item_id,
    public._tasting_voucher_item_name(v.menu_item_id, v.menu_item_id_2) as item_name,
    count(v.id)::bigint as issued,
    count(v.id) filter (where v.status = 'redeemed')::bigint as redeemed,
    count(v.id) filter (where v.status = 'active')::bigint as remaining
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  where v.tasting_package_purchase_id is not null
    and p.package_id = p_package_id
    and v.org_id = p_org_id
    and p.status in ('paid', 'minted')
    and (p_tier is null or p.tier = p_tier)
  group by v.menu_item_id, v.menu_item_id_2
  order by item_name;
end;
$$;

grant execute on function public.list_tasting_shop_items(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 1e. Host dashboard (one row per active package when p_package_id is null)
-- ---------------------------------------------------------------------------
create or replace function public.get_host_tasting_dashboard(
  p_org_id uuid,
  p_package_id uuid default null
)
returns table (
  package_id uuid,
  package_title text,
  tier text,
  org_id uuid,
  org_name text,
  expected_vouchers bigint,
  redeemed bigint,
  remaining bigint,
  item_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_scan_vouchers_for_org(auth.uid(), p_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  with org_packages as (
    select distinct tp.id as package_id, tp.title, tp.updated_at, tps.tier
    from public.tasting_package_shops tps
    join public.tasting_packages tp on tp.id = tps.package_id
    where tps.org_id = p_org_id
      and tp.status = 'published'
      and tp.is_active = true
      and (p_package_id is null or tp.id = p_package_id)
  ),
  stats as (
    select
      op.package_id,
      op.tier,
      count(v.id)::bigint as expected_vouchers,
      count(v.id) filter (where v.status = 'redeemed')::bigint as redeemed,
      count(v.id) filter (where v.status = 'active')::bigint as remaining
    from org_packages op
    join public.tasting_package_purchases p
      on p.package_id = op.package_id and p.tier = op.tier and p.status in ('paid', 'minted')
    join public.vouchers v
      on v.tasting_package_purchase_id = p.id and v.org_id = p_org_id
    group by op.package_id, op.tier
  ),
  primary_items as (
    select distinct on (tps.package_id, tps.tier)
      tps.package_id,
      tps.tier,
      public._tasting_voucher_item_name(
        max(case when tpi.portion_index = 1 then tpi.menu_item_id end),
        max(case when tpi.portion_index = 2 then tpi.menu_item_id end)
      ) as item_name
    from public.tasting_package_shops tps
    join public.tasting_package_items tpi on tpi.package_shop_id = tps.id
    where tps.org_id = p_org_id
    group by tps.package_id, tps.tier, tps.id, tps.sort_order
    order by tps.package_id, tps.tier, tps.sort_order
  )
  select
    op.package_id,
    op.title as package_title,
    op.tier,
    p_org_id as org_id,
    o.org_name,
    coalesce(s.expected_vouchers, 0)::bigint,
    coalesce(s.redeemed, 0)::bigint,
    coalesce(s.remaining, 0)::bigint,
    coalesce(pi.item_name, 'Tasting drink') as item_name
  from org_packages op
  join public.orgs o on o.id = p_org_id
  left join stats s on s.package_id = op.package_id and s.tier = op.tier
  left join primary_items pi on pi.package_id = op.package_id and pi.tier = op.tier
  order by op.updated_at desc, op.tier;
end;
$$;

grant execute on function public.get_host_tasting_dashboard(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1e. Host redemption history
-- ---------------------------------------------------------------------------
create or replace function public.list_host_tasting_redemptions(
  p_org_id uuid,
  p_package_id uuid default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns table (
  voucher_id uuid,
  redeemed_at timestamptz,
  buyer_name text,
  package_title text,
  tier text,
  item_name text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_scan_vouchers_for_org(auth.uid(), p_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.id as voucher_id,
    v.redeemed_at,
    coalesce(nullif(trim(pr.username), ''), 'Member') as buyer_name,
    tp.title as package_title,
    p.tier,
    public._tasting_voucher_item_name(v.menu_item_id, v.menu_item_id_2) as item_name,
    v.status
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.tasting_packages tp on tp.id = p.package_id
  left join public.profiles pr on pr.user_id = p.user_id
  where v.tasting_package_purchase_id is not null
    and v.org_id = p_org_id
    and v.status = 'redeemed'
    and p.status in ('paid', 'minted')
    and (p_package_id is null or p.package_id = p_package_id)
    and (p_date_from is null or v.redeemed_at >= p_date_from)
    and (p_date_to is null or v.redeemed_at <= p_date_to)
  order by v.redeemed_at desc;
end;
$$;

grant execute on function public.list_host_tasting_redemptions(uuid, uuid, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Package detail summary (for admin package detail page)
-- ---------------------------------------------------------------------------
create or replace function public.get_tasting_package_tracking_summary(
  p_package_id uuid,
  p_tier text default null
)
returns table (
  package_id uuid,
  package_title text,
  package_status text,
  is_active boolean,
  sold bigint,
  revenue_cents bigint,
  vouchers_per_purchase int,
  vouchers_created bigint,
  vouchers_redeemed bigint,
  vouchers_unredeemed bigint,
  redemption_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vouchers_per int;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select case
    when p_tier = 'duo' then 7
    when p_tier = 'single' then 5
    else null
  end into v_vouchers_per;

  return query
  with sales as (
    select
      count(*)::bigint as sold,
      coalesce(sum(p.amount_cents), 0)::bigint as revenue_cents
    from public.tasting_package_purchases p
    where p.package_id = p_package_id
      and p.status in ('paid', 'minted')
      and (p_tier is null or p.tier = p_tier)
  ),
  vstats as (
    select
      count(v.id)::bigint as created,
      count(v.id) filter (where v.status = 'redeemed')::bigint as redeemed,
      count(v.id) filter (where v.status = 'active')::bigint as unredeemed
    from public.vouchers v
    join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
    where p.package_id = p_package_id
      and p.status in ('paid', 'minted')
      and (p_tier is null or p.tier = p_tier)
  )
  select
    tp.id,
    tp.title,
    tp.status,
    tp.is_active,
    s.sold,
    s.revenue_cents,
    v_vouchers_per,
    vs.created,
    vs.redeemed,
    vs.unredeemed,
    case when vs.created > 0 then round((vs.redeemed::numeric / vs.created::numeric) * 100, 1) else 0 end
  from public.tasting_packages tp
  cross join sales s
  cross join vstats vs
  where tp.id = p_package_id;
end;
$$;

grant execute on function public.get_tasting_package_tracking_summary(uuid, text) to authenticated;
