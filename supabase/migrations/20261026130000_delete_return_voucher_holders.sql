-- Staff delete of issued return vouchers. Removes the wallet row and any visit log.

create function public.delete_return_voucher_holders(p_preset_id uuid, p_voucher_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_deleted integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if p_voucher_ids is null or cardinality(p_voucher_ids) = 0 then
    return 0;
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
    or public.can_manage_org_offers(auth.uid(), v_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  -- Visit logs cannot survive a voucher delete: the check requires voucher_id when log_type is voucher.
  delete from public.daily_coffees dc
  where dc.log_type = 'voucher'
    and dc.voucher_id in (
      select v.id
      from public.vouchers v
      where v.id = any(p_voucher_ids)
        and v.return_voucher_preset_id = p_preset_id
    );

  delete from public.vouchers v
  where v.id = any(p_voucher_ids)
    and v.return_voucher_preset_id = p_preset_id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.delete_return_voucher_holders(uuid, uuid[]) from public;
grant execute on function public.delete_return_voucher_holders(uuid, uuid[]) to authenticated;

comment on function public.delete_return_voucher_holders(uuid, uuid[]) is
  'Org owner, host, or manager: delete issued return vouchers for one preset, including visit logs.';
