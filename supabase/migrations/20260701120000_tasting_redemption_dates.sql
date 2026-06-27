-- Tasting package: host-configured redemption dates with per-date capacity.

-- ---------------------------------------------------------------------------
-- 1) Schema
-- ---------------------------------------------------------------------------
create table public.tasting_package_redemption_dates (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.tasting_packages (id) on delete cascade,
  redeem_date date not null,
  is_available boolean not null default true,
  max_purchases int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasting_pkg_redemption_dates_unique unique (package_id, redeem_date),
  constraint tasting_pkg_redemption_max_check check (max_purchases >= 1)
);

create index idx_tasting_pkg_redemption_dates_package
  on public.tasting_package_redemption_dates (package_id, redeem_date);

drop trigger if exists trg_tasting_pkg_redemption_dates_updated_at on public.tasting_package_redemption_dates;
create trigger trg_tasting_pkg_redemption_dates_updated_at
  before update on public.tasting_package_redemption_dates
  for each row execute function public.set_updated_at();

alter table public.tasting_package_purchases
  add column if not exists redeem_date date;

create index idx_tasting_package_purchases_redeem_date
  on public.tasting_package_purchases (package_id, redeem_date)
  where redeem_date is not null;

-- ---------------------------------------------------------------------------
-- 2) RLS
-- ---------------------------------------------------------------------------
alter table public.tasting_package_redemption_dates enable row level security;

create policy tasting_pkg_redemption_dates_select_published
  on public.tasting_package_redemption_dates for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.tasting_packages tp
      where tp.id = package_id and tp.status = 'published' and tp.is_active = true
    )
  );

create policy tasting_pkg_redemption_dates_super_admin_all
  on public.tasting_package_redemption_dates for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------
create or replace function public._opening_hours_day_key(p_date date)
returns text
language sql
immutable
as $$
  select case extract(isodow from p_date)::int
    when 1 then 'mon'
    when 2 then 'tue'
    when 3 then 'wed'
    when 4 then 'thu'
    when 5 then 'fri'
    when 6 then 'sat'
    when 7 then 'sun'
  end;
$$;

create or replace function public._org_open_at(
  p_opening_hours jsonb,
  p_date date,
  p_at timestamptz
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_day_key text;
  v_day jsonb;
  v_closed boolean;
  v_open time;
  v_close time;
  v_local_time time;
begin
  if p_opening_hours is null then
    return true;
  end if;

  v_day_key := public._opening_hours_day_key(p_date);
  v_day := p_opening_hours -> v_day_key;

  if v_day is null then
    return true;
  end if;

  v_closed := coalesce((v_day ->> 'closed')::boolean, false);
  if v_closed then
    return false;
  end if;

  v_open := coalesce(nullif(substring(v_day ->> 'open' from 1 for 5), ''), '09:00')::time;
  v_close := coalesce(nullif(substring(v_day ->> 'close' from 1 for 5), ''), '18:00')::time;
  v_local_time := (p_at at time zone 'Asia/Hong_Kong')::time;

  return v_local_time >= v_open and v_local_time <= v_close;
end;
$$;

create or replace function public._tasting_redeem_end_at(p_redeem_date date)
returns timestamptz
language sql
immutable
as $$
  select (
    (p_redeem_date::text || ' 00:00:00')::timestamp at time zone 'Asia/Hong_Kong'
    + interval '1 day'
    - interval '1 second'
  );
$$;

create or replace function public._tasting_redemption_booked_count(
  p_package_id uuid,
  p_redeem_date date
)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from public.tasting_package_purchases p
  where p.package_id = p_package_id
    and p.redeem_date = p_redeem_date
    and p.status in ('pending', 'paid', 'minted');
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC: list redemption dates with booking stats
-- ---------------------------------------------------------------------------
create or replace function public.get_tasting_package_redemption_dates(p_package_id uuid)
returns table (
  id uuid,
  redeem_date date,
  is_available boolean,
  max_purchases int,
  booked_count int,
  remaining int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.redeem_date,
    d.is_available,
    d.max_purchases,
    public._tasting_redemption_booked_count(d.package_id, d.redeem_date) as booked_count,
    greatest(
      d.max_purchases - public._tasting_redemption_booked_count(d.package_id, d.redeem_date),
      0
    ) as remaining
  from public.tasting_package_redemption_dates d
  where d.package_id = p_package_id
  order by d.redeem_date asc;
$$;

grant execute on function public.get_tasting_package_redemption_dates(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Mint: fixed redemption day expiry
-- ---------------------------------------------------------------------------
create or replace function public.mint_tasting_package_vouchers(p_purchase_id uuid)
returns table (voucher_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.tasting_package_purchases%rowtype;
  pkg public.tasting_packages%rowtype;
  rd public.tasting_package_redemption_dates%rowtype;
  r record;
  v_code text;
  v_expires timestamptz;
  v_ids uuid[] := array[]::uuid[];
  v_codes text[] := array[]::text[];
  v_agg jsonb;
  v_booked int;
begin
  select * into pay
  from public.tasting_package_purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'PURCHASE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if pay.status = 'minted' then
    return query
    select (e->>'vid')::uuid, e->>'code'
    from jsonb_array_elements(pay.minted_vouchers_json) e;
    return;
  end if;

  if pay.status not in ('pending', 'paid') then
    raise exception 'PURCHASE_NOT_FINALIZABLE' using errcode = 'P0001';
  end if;

  select * into pkg from public.tasting_packages where id = pay.package_id;
  if not found or pkg.status <> 'published' or not pkg.is_active then
    raise exception 'PACKAGE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if pay.redeem_date is not null then
    select * into rd
    from public.tasting_package_redemption_dates
    where package_id = pay.package_id
      and redeem_date = pay.redeem_date;

    if not found or not rd.is_available then
      raise exception 'REDEMPTION_DATE_UNAVAILABLE' using errcode = 'P0001';
    end if;

    v_booked := public._tasting_redemption_booked_count(pay.package_id, pay.redeem_date);
    if v_booked > rd.max_purchases then
      raise exception 'REDEMPTION_DATE_SOLD_OUT' using errcode = 'P0001';
    end if;

    v_expires := public._tasting_redeem_end_at(pay.redeem_date);
  else
    v_expires := now() + make_interval(days => greatest(pkg.redeem_valid_days, 1));
  end if;

  if pay.tier = 'duo' then
    for r in
      select
        tps.org_id,
        max(case when tpi.portion_index = 1 then tpi.id::text end)::uuid as item_id,
        max(case when tpi.portion_index = 1 then tpi.menu_item_id::text end)::uuid as menu_id_1,
        max(case when tpi.portion_index = 2 then tpi.menu_item_id::text end)::uuid as menu_id_2
      from public.tasting_package_shops tps
      join public.tasting_package_items tpi on tpi.package_shop_id = tps.id
      where tps.package_id = pay.package_id
        and tps.tier = 'duo'
      group by tps.id, tps.org_id, tps.sort_order
      having count(tpi.id) >= 2
        and max(case when tpi.portion_index = 1 then tpi.id::text end) is not null
        and max(case when tpi.portion_index = 1 then tpi.menu_item_id::text end) is not null
        and max(case when tpi.portion_index = 2 then tpi.menu_item_id::text end) is not null
      order by tps.sort_order
    loop
      v_code := public._generate_voucher_code();

      insert into public.vouchers (
        org_id,
        owner_id,
        code,
        status,
        expires_at,
        tasting_package_purchase_id,
        tasting_package_item_id,
        menu_item_id,
        menu_item_id_2
      ) values (
        r.org_id,
        pay.user_id,
        v_code,
        'active',
        v_expires,
        pay.id,
        r.item_id,
        r.menu_id_1,
        r.menu_id_2
      )
      returning id, vouchers.code into voucher_id, code;

      v_ids := array_append(v_ids, voucher_id);
      v_codes := array_append(v_codes, code);
      return next;
    end loop;
  else
    for r in
      select
        tpi.id as item_id,
        tps.org_id,
        tpi.menu_item_id
      from public.tasting_package_shops tps
      join public.tasting_package_items tpi on tpi.package_shop_id = tps.id
      where tps.package_id = pay.package_id
        and tps.tier = pay.tier
      order by tps.sort_order, tpi.portion_index
    loop
      v_code := public._generate_voucher_code();

      insert into public.vouchers (
        org_id,
        owner_id,
        code,
        status,
        expires_at,
        tasting_package_purchase_id,
        tasting_package_item_id,
        menu_item_id
      ) values (
        r.org_id,
        pay.user_id,
        v_code,
        'active',
        v_expires,
        pay.id,
        r.item_id,
        r.menu_item_id
      )
      returning id, vouchers.code into voucher_id, code;

      v_ids := array_append(v_ids, voucher_id);
      v_codes := array_append(v_codes, code);
      return next;
    end loop;
  end if;

  if array_length(v_ids, 1) is null then
    raise exception 'NO_TASTING_ITEMS' using errcode = 'P0001';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('vid', x.id, 'code', x.code)),
    '[]'::jsonb
  )
  into v_agg
  from unnest(v_ids, v_codes) as x(id, code);

  update public.tasting_package_purchases
  set status = 'minted', minted_vouchers_json = v_agg, mint_error = null, updated_at = now()
  where id = pay.id;
end;
$$;

revoke all on function public.mint_tasting_package_vouchers(uuid) from public;
grant execute on function public.mint_tasting_package_vouchers(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6) Redeem: enforce redemption day + shop opening hours
-- ---------------------------------------------------------------------------
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
  v_redeem_date date;
  v_opening_hours jsonb;
  v_today_hkt date;
begin
  if auth.uid() is null then
    return query select
      'NOT_AUTHORIZED'::text, 'Not signed in'::text, null::uuid,
      null::text, null::text, null::text, null::text,
      null::text, null::uuid, null::text;
    return;
  end if;

  select * into v_voucher from public.vouchers where code = p_code for update;

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

  if v_voucher.tasting_package_purchase_id is not null then
    select tpp.redeem_date, o.opening_hours
    into v_redeem_date, v_opening_hours
    from public.tasting_package_purchases tpp
    join public.orgs o on o.id = v_voucher.org_id
    where tpp.id = v_voucher.tasting_package_purchase_id;

    if v_redeem_date is not null then
      v_today_hkt := (now() at time zone 'Asia/Hong_Kong')::date;

      if v_today_hkt <> v_redeem_date then
        return query select
          'NOT_REDEMPTION_DAY'::text, 'Voucher can only be redeemed on the chosen day'::text, v_voucher.id,
          null::text, null::text, null::text, null::text,
          null::text, null::uuid, null::text;
        return;
      end if;

      if not public._org_open_at(v_opening_hours, v_redeem_date, now()) then
        return query select
          'SHOP_CLOSED'::text, 'Shop is closed — check opening hours'::text, v_voucher.id,
          null::text, null::text, null::text, null::text,
          null::text, null::uuid, null::text;
        return;
      end if;
    end if;
  end if;

  update public.vouchers
  set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where id = v_voucher.id;

  if v_voucher.tasting_package_item_id is not null then
    select
      o.org_name,
      tp.title,
      case
        when v.menu_item_id_2 is not null then
          case
            when lower(trim(coalesce(mi1.item_name, ''))) = lower(trim(coalesce(mi2.item_name, '')))
              and coalesce(trim(mi1.item_name), '') <> ''
            then trim(mi1.item_name) || ' × 2'
            else '1. ' || coalesce(nullif(trim(mi1.item_name), ''), 'Drink 1')
              || ' / 2. ' || coalesce(nullif(trim(mi2.item_name), ''), 'Drink 2')
          end
        else coalesce(nullif(trim(mi1.item_name), ''), 'Tasting drink')
      end,
      'Tasting'::text,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.orgs o on o.id = v.org_id
    left join public.menu_items mi1 on mi1.id = v.menu_item_id
    left join public.menu_items mi2 on mi2.id = v.menu_item_id_2
    left join public.tasting_package_purchases tpp on tpp.id = v.tasting_package_purchase_id
    left join public.tasting_packages tp on tp.id = tpp.package_id
    left join public.profiles p on p.user_id = v.owner_id
    where v.id = v_voucher.id;
  else
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
  end if;

  return query select
    'OK'::text, 'Redeemed'::text, v_voucher.id,
    v_org_name, v_campaign_title, v_item_name, v_offer_type,
    v_voucher.code, v_voucher.owner_id, v_owner_username;
end;
$$;

grant execute on function public.redeem_voucher_atomic(text) to authenticated;
