-- Super-admin-only org deletion: removes org-scoped data in FK-safe order.

create or replace function public.delete_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Forbidden';
  end if;

  if not exists (select 1 from public.orgs where id = p_org_id) then
    raise exception 'Organization not found';
  end if;

  -- 1) Voucher visit logs (CHECK forbids SET NULL on voucher delete)
  delete from public.daily_coffees dc
  where dc.log_type = 'voucher'
    and dc.voucher_id in (
      select v.id from public.vouchers v where v.org_id = p_org_id
    );

  -- 2) Stripe claim sessions for this org's campaigns
  delete from public.campaign_claim_payments cp
  where cp.campaign_id in (
    select c.id from public.campaigns c where c.org_id = p_org_id
  );

  -- 3) All minted vouchers for this org (campaign + loyalty + tasting)
  delete from public.vouchers where org_id = p_org_id;

  -- 4) Campaigns (cascades campaign_vouchers)
  delete from public.campaigns where org_id = p_org_id;

  -- 5) Tasting package shop links (cascades tasting_package_items for that shop)
  delete from public.tasting_package_shops where org_id = p_org_id;

  -- 6) Menu catalog
  delete from public.menu_items where org_id = p_org_id;

  -- 7) Org row (cascades org_hosts, org_claim_spots, shop_loyalty_settings,
  --    coffee_receipt_claims, loyalty_balances, loyalty_points_ledger, vouchers_catalog)
  delete from public.orgs where id = p_org_id;
end;
$$;

revoke all on function public.delete_org(uuid) from public;
grant execute on function public.delete_org(uuid) to authenticated;

comment on function public.delete_org(uuid) is
  'Super admin only: delete org and all org-scoped campaigns, vouchers, menu, tasting shop links.';
