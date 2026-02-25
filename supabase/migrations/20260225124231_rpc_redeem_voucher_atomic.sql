-- RPC function: redeem_voucher_atomic
-- Atomically redeems a voucher by code with concurrency safety
-- Returns status table instead of raising exceptions for normal cases

create or replace function public.redeem_voucher_atomic(p_code text)
returns table(status text, message text, voucher_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher public.vouchers%rowtype;
  v_is_host boolean;
begin
  -- Require auth
  if auth.uid() is null then
    return query select 'NOT_AUTHORIZED', 'Not signed in', null::uuid;
    return;
  end if;

  -- Host role check (matches useUserRole)
  select exists (
    select 1
    from public.user_access ua
    where ua.user_id = auth.uid()
      and ua.role in ('super_admin','run_club_host')
  )
  into v_is_host;

  if not v_is_host then
    return query select 'NOT_AUTHORIZED', 'Host only', null::uuid;
    return;
  end if;

  -- Lock voucher row
  select *
    into v_voucher
  from public.vouchers
  where code = p_code
  for update;

  if not found then
    return query select 'NOT_FOUND', 'Invalid code', null::uuid;
    return;
  end if;

  -- Expiry check
  if v_voucher.expires_at is not null and now() > v_voucher.expires_at then
    return query select 'EXPIRED', 'Voucher expired', v_voucher.id;
    return;
  end if;

  -- Already redeemed
  if v_voucher.status <> 'active' then
    return query select 'ALREADY_REDEEMED', 'Already redeemed', v_voucher.id;
    return;
  end if;

  -- Redeem
  update public.vouchers
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid()
  where id = v_voucher.id;

  return query select 'OK', 'Redeemed', v_voucher.id;
end;
$$;
