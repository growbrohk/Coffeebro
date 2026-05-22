-- redeem_voucher_atomic — add owner_username for host redeem UI
drop function if exists public.redeem_voucher_atomic(text);

create function public.redeem_voucher_atomic(p_code text)
returns table (
  status text,
  message text,
  voucher_id uuid,
  org_name text,
  campaign_title text,
  item_name text,
  offer_type text,
  voucher_code text,
  owner_id uuid,
  owner_username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher public.vouchers%rowtype;
  v_ok boolean;
  v_org_name text;
  v_campaign_title text;
  v_item_name text;
  v_offer_type text;
  v_owner_username text;
begin
  if auth.uid() is null then
    return query select
      'NOT_AUTHORIZED'::text, 'Not signed in'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text;
    return;
  end if;

  select *
  into v_voucher
  from public.vouchers
  where code = p_code
  for update;

  if not found then
    return query select
      'NOT_FOUND'::text, 'Invalid code'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text;
    return;
  end if;

  v_ok := public.has_role(auth.uid(), 'super_admin')
    or public.can_scan_vouchers_for_org(auth.uid(), v_voucher.org_id);

  if not v_ok then
    return query select
      'NOT_AUTHORIZED'::text, 'Staff only'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text;
    return;
  end if;

  if v_voucher.expires_at is not null and now() > v_voucher.expires_at then
    return query select
      'EXPIRED'::text, 'Voucher expired'::text, v_voucher.id,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text;
    return;
  end if;

  if v_voucher.status <> 'active' then
    return query select
      'ALREADY_REDEEMED'::text, 'Already redeemed'::text, v_voucher.id,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text;
    return;
  end if;

  update public.vouchers
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid()
  where id = v_voucher.id;

  select
    o.org_name,
    c.display_title,
    mi.item_name,
    cv.offer_type,
    coalesce(nullif(trim(p.username), ''), 'Member')
  into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
  from public.vouchers v
  join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  join public.campaigns c on c.id = v.campaign_id
  join public.menu_items mi on mi.id = cv.menu_item_id
  join public.orgs o on o.id = v.org_id
  left join public.profiles p on p.user_id = v.owner_id
  where v.id = v_voucher.id;

  return query select
    'OK'::text, 'Redeemed'::text, v_voucher.id,
    v_org_name, v_campaign_title, v_item_name, v_offer_type,
    v_voucher.code, v_voucher.owner_id, v_owner_username;
end;
$$;

grant execute on function public.redeem_voucher_atomic(text) to authenticated;
