-- daily_coffees: harden UPDATE against voucher-review forgery; add prefill RPC.

-- 1) Guard trigger: make log_type / voucher_id / user_id immutable; block share_publicly=true on normal rows.
create or replace function public.daily_coffees_guard_update()
returns trigger
language plpgsql
as $$
begin
  if new.log_type is distinct from old.log_type then
    raise exception 'log_type is immutable' using errcode = 'P0001';
  end if;
  if new.voucher_id is distinct from old.voucher_id then
    raise exception 'voucher_id is immutable' using errcode = 'P0001';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable' using errcode = 'P0001';
  end if;
  if old.log_type = 'normal' and coalesce(new.share_publicly, false) = true then
    raise exception 'share_publicly only valid for voucher logs' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_coffees_guard_update on public.daily_coffees;

create trigger daily_coffees_guard_update
  before update on public.daily_coffees
  for each row execute function public.daily_coffees_guard_update();

-- 2) Voucher log prefill RPC (security definer so RLS on orgs doesn't hide org_name).
create or replace function public.get_voucher_log_prefill(p_voucher_id uuid)
returns table (
  voucher_id uuid,
  org_id uuid,
  org_name text,
  menu_item_id uuid,
  menu_item_name text,
  redeemed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id as voucher_id,
    v.org_id,
    o.org_name,
    mi.id as menu_item_id,
    mi.item_name as menu_item_name,
    coalesce(v.redeemed_at, now()) as redeemed_at
  from public.vouchers v
  left join public.orgs o on o.id = v.org_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join public.menu_items mi on mi.id = cv.menu_item_id
  where v.id = p_voucher_id
    and v.owner_id = auth.uid();
$$;

comment on function public.get_voucher_log_prefill(uuid) is
  'Returns voucher org + menu details for the current owner, bypassing orgs RLS.';

grant execute on function public.get_voucher_log_prefill(uuid) to authenticated;
