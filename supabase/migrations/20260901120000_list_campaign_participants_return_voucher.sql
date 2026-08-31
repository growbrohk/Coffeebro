-- Extend list_campaign_participants with minted return-voucher status and dates.

drop function if exists public.list_campaign_participants(uuid);

create function public.list_campaign_participants(p_campaign_id uuid)
returns table (
  voucher_id uuid,
  owner_id uuid,
  owner_name text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  code text,
  offer_type text,
  item_name text,
  return_voucher_status text,
  return_voucher_redeemed_at timestamptz,
  return_voucher_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select c.org_id into v_org_id
  from public.campaigns c
  where c.id = p_campaign_id;

  if v_org_id is null then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.is_org_owner(auth.uid(), v_org_id)
    or public.can_scan_vouchers_for_org(auth.uid(), v_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.id as voucher_id,
    v.owner_id,
    coalesce(p.username, '') as owner_name,
    v.status,
    v.created_at,
    v.redeemed_at,
    v.code,
    cv.offer_type,
    mi.item_name,
    rv.status as return_voucher_status,
    rv.redeemed_at as return_voucher_redeemed_at,
    rv.expires_at as return_voucher_expires_at
  from public.vouchers v
  left join public.profiles p on p.user_id = v.owner_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join public.menu_items mi on mi.id = cv.menu_item_id
  left join lateral (
    select rv_inner.status, rv_inner.redeemed_at, rv_inner.expires_at
    from public.vouchers rv_inner
    where rv_inner.minted_from_voucher_id = v.id
    order by rv_inner.created_at desc
    limit 1
  ) rv on true
  where v.campaign_id = p_campaign_id
  order by v.created_at asc;
end;
$$;

grant execute on function public.list_campaign_participants(uuid) to authenticated;
