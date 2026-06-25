-- Fix get_host_tasting_dashboard: PostgreSQL has no max(uuid); cast through text.

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
        max(case when tpi.portion_index = 1 then tpi.menu_item_id::text end)::uuid,
        max(case when tpi.portion_index = 2 then tpi.menu_item_id::text end)::uuid
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
