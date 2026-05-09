-- Loyalty CRM: receipt-scanned café visits (log_type=receipt), per-org points, catalog redemptions.

-- ---------------------------------------------------------------------------
-- 1) daily_coffees: receipt columns + log_type 'receipt'
-- ---------------------------------------------------------------------------
alter table public.daily_coffees
  add column if not exists receipt_amount_cents int,
  add column if not exists receipt_line_items jsonb;

alter table public.daily_coffees drop constraint if exists daily_coffees_log_type_check;
alter table public.daily_coffees
  add constraint daily_coffees_log_type_check
  check (log_type in ('normal', 'voucher', 'receipt'));

alter table public.daily_coffees drop constraint if exists daily_coffees_log_type_voucher_id_check;
alter table public.daily_coffees
  add constraint daily_coffees_log_type_voucher_id_check
  check (
    (log_type = 'voucher' and voucher_id is not null)
    or (log_type in ('normal', 'receipt') and voucher_id is null)
  );

comment on column public.daily_coffees.receipt_amount_cents is 'Set when log_type=receipt';
comment on column public.daily_coffees.receipt_line_items is 'Gemini line items JSON when log_type=receipt';

-- ---------------------------------------------------------------------------
-- 2) shop_loyalty_settings
-- ---------------------------------------------------------------------------
create table public.shop_loyalty_settings (
  org_id uuid primary key references public.orgs (id) on delete cascade,
  cents_per_point int not null default 100,
  redemption_mode text not null default 'auto',
  updated_at timestamptz not null default now(),
  constraint shop_loyalty_settings_redemption_mode_check check (redemption_mode = 'auto')
);

comment on table public.shop_loyalty_settings is 'Points conversion: points = floor(receipt_amount_cents / cents_per_point). v1: auto only.';
comment on column public.shop_loyalty_settings.cents_per_point is 'HKD minor units per 1 loyalty point (e.g. 100 = $1 = 1pt).';

alter table public.shop_loyalty_settings enable row level security;

create policy shop_loyalty_settings_select_authenticated
  on public.shop_loyalty_settings for select
  to authenticated
  using (true);

create policy shop_loyalty_settings_insert_staff
  on public.shop_loyalty_settings for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy shop_loyalty_settings_update_staff
  on public.shop_loyalty_settings for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

-- ---------------------------------------------------------------------------
-- 3) coffee_receipt_claims (dedupe)
-- ---------------------------------------------------------------------------
create table public.coffee_receipt_claims (
  id uuid primary key default gen_random_uuid(),
  receipt_key text not null,
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  points_awarded int not null default 0,
  daily_coffee_id uuid references public.daily_coffees (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint coffee_receipt_claims_receipt_key_unique unique (receipt_key)
);

create index idx_coffee_receipt_claims_org_id on public.coffee_receipt_claims (org_id);
create index idx_coffee_receipt_claims_user_id on public.coffee_receipt_claims (user_id);

alter table public.coffee_receipt_claims enable row level security;

create policy coffee_receipt_claims_select_own
  on public.coffee_receipt_claims for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) loyalty_balances
-- ---------------------------------------------------------------------------
create table public.loyalty_balances (
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  balance int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index idx_loyalty_balances_org_id on public.loyalty_balances (org_id);

alter table public.loyalty_balances enable row level security;

create policy loyalty_balances_select_own
  on public.loyalty_balances for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) loyalty_points_ledger
-- ---------------------------------------------------------------------------
create table public.loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now(),
  constraint loyalty_points_ledger_reason_check check (reason in ('receipt_scan', 'catalog_redeem', 'manual_adjust'))
);

create index idx_loyalty_points_ledger_user on public.loyalty_points_ledger (user_id, org_id);

alter table public.loyalty_points_ledger enable row level security;

create policy loyalty_points_ledger_select_own
  on public.loyalty_points_ledger for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6) vouchers_catalog
-- ---------------------------------------------------------------------------
create table public.vouchers_catalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  title text not null,
  points_cost int not null,
  active boolean not null default true,
  quantity_cap int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vouchers_catalog_points_cost_positive check (points_cost > 0)
);

create index idx_vouchers_catalog_org_id on public.vouchers_catalog (org_id);

alter table public.vouchers_catalog enable row level security;

create policy vouchers_catalog_select_active
  on public.vouchers_catalog for select
  to authenticated
  using (
    active = true
    or public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy vouchers_catalog_insert_staff
  on public.vouchers_catalog for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy vouchers_catalog_update_staff
  on public.vouchers_catalog for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

create policy vouchers_catalog_delete_staff
  on public.vouchers_catalog for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), org_id)
  );

-- ---------------------------------------------------------------------------
-- 7) vouchers: nullable campaign FKs + loyalty_catalog_id
-- ---------------------------------------------------------------------------
alter table public.vouchers alter column campaign_id drop not null;
alter table public.vouchers alter column campaign_voucher_id drop not null;

alter table public.vouchers
  add column if not exists loyalty_catalog_id uuid references public.vouchers_catalog (id) on delete restrict;

alter table public.vouchers
  add constraint vouchers_campaign_or_loyalty_check check (
    (
      campaign_id is not null
      and campaign_voucher_id is not null
      and loyalty_catalog_id is null
    )
    or (
      loyalty_catalog_id is not null
      and campaign_id is null
      and campaign_voucher_id is null
    )
  );

create index if not exists idx_vouchers_loyalty_catalog_id on public.vouchers (loyalty_catalog_id);

-- ---------------------------------------------------------------------------
-- 8) finalize_receipt_scan(p_org_id, p_receipt_key, p_amount_cents, p_items, p_place, p_coffee_date)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_receipt_scan(
  p_org_id uuid,
  p_receipt_key text,
  p_amount_cents int,
  p_items jsonb,
  p_place text,
  p_coffee_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claim_id uuid;
  v_dc_id uuid;
  v_cents_per_point int;
  v_points int;
  v_new_balance int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.orgs o where o.id = p_org_id) then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_receipt_key is null or length(trim(p_receipt_key)) = 0 then
    raise exception 'INVALID_RECEIPT_KEY' using errcode = 'P0001';
  end if;

  begin
    insert into public.coffee_receipt_claims (receipt_key, org_id, user_id, points_awarded)
    values (p_receipt_key, p_org_id, v_uid, 0)
    returning id into v_claim_id;
  exception
    when unique_violation then
      raise exception 'ALREADY_CLAIMED' using errcode = 'P0001';
  end;

  select s.cents_per_point into v_cents_per_point
  from public.shop_loyalty_settings s
  where s.org_id = p_org_id;

  if v_cents_per_point is null then
    insert into public.shop_loyalty_settings (org_id, cents_per_point)
    values (p_org_id, 100)
    on conflict (org_id) do nothing;
    select s.cents_per_point into v_cents_per_point
    from public.shop_loyalty_settings s
    where s.org_id = p_org_id;
  end if;

  if v_cents_per_point is null or v_cents_per_point < 1 then
    v_cents_per_point := 100;
  end if;

  v_points := greatest(0, floor(coalesce(p_amount_cents, 0)::numeric / v_cents_per_point)::int);

  insert into public.daily_coffees (
    user_id,
    coffee_date,
    place,
    log_item,
    log_item_other,
    tasting_notes,
    location_kind,
    org_id,
    log_type,
    share_publicly,
    receipt_amount_cents,
    receipt_line_items
  )
  values (
    v_uid,
    coalesce(p_coffee_date, (timezone('UTC', now()))::date),
    coalesce(nullif(trim(p_place), ''), 'Coffee shop'),
    null,
    null,
    null,
    'coffee_shop',
    p_org_id,
    'receipt',
    false,
    p_amount_cents,
    p_items
  )
  returning id into v_dc_id;

  update public.coffee_receipt_claims
  set points_awarded = v_points, daily_coffee_id = v_dc_id
  where id = v_claim_id;

  insert into public.loyalty_points_ledger (user_id, org_id, delta, reason, ref_id)
  values (v_uid, p_org_id, v_points, 'receipt_scan', v_claim_id);

  insert into public.loyalty_balances (user_id, org_id, balance)
  values (v_uid, p_org_id, v_points)
  on conflict (user_id, org_id) do update
  set balance = public.loyalty_balances.balance + excluded.balance,
      updated_at = now()
  returning balance into v_new_balance;

  if v_new_balance is null then
    select balance into v_new_balance from public.loyalty_balances where user_id = v_uid and org_id = p_org_id;
  end if;

  return jsonb_build_object(
    'points_awarded', v_points,
    'new_balance', coalesce(v_new_balance, v_points),
    'daily_coffee_id', v_dc_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) redeem_catalog_item
-- ---------------------------------------------------------------------------
create or replace function public.redeem_catalog_item(p_catalog_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cat public.vouchers_catalog%rowtype;
  v_org uuid;
  v_bal int;
  v_code text;
  v_vid uuid;
  v_minted int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select * into v_cat from public.vouchers_catalog where id = p_catalog_id for update;
  if not found then
    raise exception 'CATALOG_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_cat.active is not true then
    raise exception 'CATALOG_INACTIVE' using errcode = 'P0001';
  end if;

  v_org := v_cat.org_id;

  if v_cat.quantity_cap is not null then
    select count(*)::int into v_minted
    from public.vouchers v
    where v.loyalty_catalog_id = p_catalog_id
      and v.status in ('active', 'redeemed');
    if v_minted >= v_cat.quantity_cap then
      raise exception 'CATALOG_SOLD_OUT' using errcode = 'P0001';
    end if;
  end if;

  update public.loyalty_balances lb
  set balance = lb.balance - v_cat.points_cost,
      updated_at = now()
  where lb.user_id = v_uid
    and lb.org_id = v_org
    and lb.balance >= v_cat.points_cost
  returning lb.balance into v_bal;

  if not found then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
  end if;

  insert into public.loyalty_points_ledger (user_id, org_id, delta, reason, ref_id)
  values (v_uid, v_org, -v_cat.points_cost, 'catalog_redeem', p_catalog_id);

  v_code := public._generate_voucher_code();

  insert into public.vouchers (
    org_id,
    owner_id,
    code,
    status,
    loyalty_catalog_id,
    expires_at
  )
  values (
    v_org,
    v_uid,
    v_code,
    'active',
    p_catalog_id,
    now() + interval '90 days'
  )
  returning id into v_vid;

  return jsonb_build_object('id', v_vid, 'code', v_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) upsert_shop_loyalty_settings
-- ---------------------------------------------------------------------------
create or replace function public.upsert_shop_loyalty_settings(
  p_org_id uuid,
  p_cents_per_point int
)
returns void
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
    or public.can_manage_org_offers(auth.uid(), p_org_id)
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_cents_per_point is null or p_cents_per_point < 1 then
    raise exception 'INVALID_CENTS_PER_POINT' using errcode = 'P0001';
  end if;

  insert into public.shop_loyalty_settings (org_id, cents_per_point)
  values (p_org_id, p_cents_per_point)
  on conflict (org_id) do update
  set cents_per_point = excluded.cents_per_point,
      updated_at = now();
end;
$$;

-- grants
grant execute on function public.finalize_receipt_scan(uuid, text, int, jsonb, text, date) to authenticated;
grant execute on function public.redeem_catalog_item(uuid) to authenticated;
grant execute on function public.upsert_shop_loyalty_settings(uuid, int) to authenticated;

comment on function public.finalize_receipt_scan(uuid, text, int, jsonb, text, date) is
  'Creates receipt claim, daily_coffees row (log_type=receipt), awards loyalty points. Call with user JWT (e.g. from Edge Function).';
comment on function public.redeem_catalog_item(uuid) is 'Redeem loyalty catalog item for points; mints voucher row with loyalty_catalog_id only.';
