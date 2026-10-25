-- Staff list of issued vouchers for one return-voucher preset.

create function public.list_return_voucher_holders(p_preset_id uuid)
returns table (
  voucher_id uuid,
  owner_id uuid,
  owner_name text,
  status text,
  code text,
  created_at timestamptz,
  redeemed_at timestamptz,
  redeemable_from timestamptz,
  expires_at timestamptz
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

  select rvp.org_id into v_org_id
  from public.return_voucher_presets rvp
  where rvp.id = p_preset_id;

  if v_org_id is null then
    raise exception 'PRESET_NOT_FOUND' using errcode = 'P0001';
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
    v.code,
    v.created_at,
    v.redeemed_at,
    v.redeemable_from,
    v.expires_at
  from public.vouchers v
  left join public.profiles p on p.user_id = v.owner_id
  where v.return_voucher_preset_id = p_preset_id
  order by v.created_at desc;
end;
$$;

revoke all on function public.list_return_voucher_holders(uuid) from public;
grant execute on function public.list_return_voucher_holders(uuid) to authenticated;

comment on function public.list_return_voucher_holders(uuid) is
  'Org staff: issued vouchers for one return-voucher preset, including status and redemption window.';
