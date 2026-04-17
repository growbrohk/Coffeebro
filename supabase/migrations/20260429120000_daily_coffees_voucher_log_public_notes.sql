-- daily_coffees: voucher-linked visit logs, public org tasting notes RPC, realtime on vouchers

-- 1) Columns
alter table public.daily_coffees
  add column if not exists log_type text not null default 'normal',
  add column if not exists share_publicly boolean not null default false,
  add column if not exists voucher_id uuid null references public.vouchers (id) on delete set null;

alter table public.daily_coffees
  add constraint daily_coffees_log_type_check
  check (log_type in ('normal', 'voucher'));

alter table public.daily_coffees
  add constraint daily_coffees_log_type_voucher_id_check
  check (
    (log_type = 'voucher' and voucher_id is not null)
    or (log_type = 'normal' and voucher_id is null)
  );

create index if not exists idx_daily_coffees_org_log_type
  on public.daily_coffees (org_id, log_type)
  where org_id is not null;

create unique index if not exists uq_daily_coffees_voucher_id
  on public.daily_coffees (voucher_id)
  where voucher_id is not null;

-- 2) INSERT policy: block direct client inserts for log_type = voucher (use RPC only)
drop policy if exists daily_coffees_insert_own on public.daily_coffees;

create policy daily_coffees_insert_own
  on public.daily_coffees
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and coalesce(log_type, 'normal') = 'normal'
    and voucher_id is null
  );

-- 3) log_coffee_for_voucher — security definer insert for voucher visit logs
create or replace function public.log_coffee_for_voucher(
  p_voucher_id uuid,
  p_org_id uuid,
  p_place text,
  p_log_item text,
  p_log_item_other text,
  p_tasting_notes text,
  p_share_publicly boolean,
  p_coffee_date date
)
returns public.daily_coffees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_v public.vouchers%rowtype;
  rec public.daily_coffees;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select *
  into v_v
  from public.vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'VOUCHER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_v.owner_id is distinct from auth.uid() then
    raise exception 'NOT_OWNER' using errcode = 'P0001';
  end if;

  if v_v.status is distinct from 'redeemed' then
    raise exception 'VOUCHER_NOT_REDEEMED' using errcode = 'P0001';
  end if;

  if v_v.org_id is distinct from p_org_id then
    raise exception 'ORG_MISMATCH' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.daily_coffees dc where dc.voucher_id = p_voucher_id) then
    raise exception 'ALREADY_LOGGED' using errcode = 'P0001';
  end if;

  insert into public.daily_coffees (
    user_id,
    coffee_date,
    location_kind,
    org_id,
    place,
    log_item,
    log_item_other,
    tasting_notes,
    log_type,
    voucher_id,
    share_publicly
  )
  values (
    auth.uid(),
    p_coffee_date,
    'coffee_shop',
    p_org_id,
    nullif(trim(coalesce(p_place, '')), ''),
    p_log_item,
    nullif(trim(coalesce(p_log_item_other, '')), ''),
    nullif(trim(coalesce(p_tasting_notes, '')), ''),
    'voucher',
    p_voucher_id,
    coalesce(p_share_publicly, false)
  )
  returning * into rec;

  return rec;
end;
$$;

comment on function public.log_coffee_for_voucher is
  'Inserts a voucher-linked coffee log after staff redemption; validates owner, redeemed status, org match.';

grant execute on function public.log_coffee_for_voucher(
  uuid, uuid, text, text, text, text, boolean, date
) to authenticated;

-- 4) Public org tasting notes (keyset pagination)
create or replace function public.get_public_org_coffee_notes(
  p_org_id uuid,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_limit int
)
returns table (
  id uuid,
  tasting_notes text,
  menu_item_label text,
  created_at timestamptz,
  reviewer_label text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dc.id,
    dc.tasting_notes,
    case
      when trim(coalesce(dc.log_item, '')) = 'Other' then nullif(trim(dc.log_item_other), '')
      else nullif(trim(dc.log_item), '')
    end as menu_item_label,
    dc.created_at,
    coalesce(nullif(trim(p.username), ''), 'Member') as reviewer_label
  from public.daily_coffees dc
  left join public.profiles p on p.user_id = dc.user_id
  where dc.org_id = p_org_id
    and dc.log_type = 'voucher'
    and dc.share_publicly = true
    and dc.tasting_notes is not null
    and trim(dc.tasting_notes) <> ''
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (dc.created_at, dc.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by dc.created_at desc, dc.id desc
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

comment on function public.get_public_org_coffee_notes is
  'Public tasting notes for an org (opt-in share_publicly, voucher logs only).';

grant execute on function public.get_public_org_coffee_notes(uuid, timestamptz, uuid, int) to anon;
grant execute on function public.get_public_org_coffee_notes(uuid, timestamptz, uuid, int) to authenticated;

-- 5) daily_coffees_authed_read — expose log_type only (no voucher_id)
drop view if exists public.daily_coffees_authed_read;

create view public.daily_coffees_authed_read
with (security_invoker = on) as
select
  user_id,
  coffee_date,
  log_type
from public.daily_coffees;

grant select on public.daily_coffees_authed_read to authenticated;
revoke all on public.daily_coffees_authed_read from anon;

-- 6) Realtime: vouchers updates for owner notification (idempotent add)
do $$
begin
  alter publication supabase_realtime add table public.vouchers;
exception
  when duplicate_object then null;
end $$;
