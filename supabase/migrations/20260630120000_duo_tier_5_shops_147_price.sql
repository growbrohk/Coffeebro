-- Duo tier: 5 shops at $147 (was 7 shops at $177).

-- 1) Update Duo price default and existing packages
alter table public.tasting_packages
  alter column duo_price_cents set default 14700;

update public.tasting_packages
set duo_price_cents = 14700;

-- 2) Trim excess Duo shops (keep first 5 per package; skip shops with minted vouchers)
delete from public.tasting_package_shops tps
using (
  select id from (
    select id,
           row_number() over (partition by package_id order by sort_order, id) as rn
    from public.tasting_package_shops
    where tier = 'duo'
  ) x
  where rn > 5
) excess
where tps.id = excess.id
  and not exists (
    select 1
    from public.tasting_package_items tpi
    join public.vouchers v on v.tasting_package_item_id = tpi.id
    where tpi.package_shop_id = tps.id
  );

-- 3) Enforce 5-shop Duo limit (was 7)
create or replace function public.enforce_tasting_package_shop_limits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_count int;
  v_max int;
begin
  if new.tier = 'single' then
    v_max := 5;
  else
    v_max := 5;
  end if;

  select count(*)::int
  into v_count
  from public.tasting_package_shops tps
  where tps.package_id = new.package_id
    and tps.tier = new.tier
    and (tg_op = 'INSERT' or tps.id <> new.id);

  if v_count >= v_max then
    raise exception 'TASTING_PACKAGE_SHOP_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- 4) Tracking summary: Duo vouchers per purchase = 5 (was 7)
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
    when p_tier = 'duo' then 5
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
