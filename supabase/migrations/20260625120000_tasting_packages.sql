-- Tasting packages: cross-shop bundles with Single ($77) and Duo ($177) tiers.

-- ---------------------------------------------------------------------------
-- 1) Core tables
-- ---------------------------------------------------------------------------
create table public.tasting_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  district text not null,
  cover_image_url text,
  status text not null default 'draft',
  single_price_cents int not null default 7700,
  duo_price_cents int not null default 17700,
  redeem_valid_days int not null default 90,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasting_packages_status_check check (status in ('draft', 'published')),
  constraint tasting_packages_single_price_check check (single_price_cents >= 0),
  constraint tasting_packages_duo_price_check check (duo_price_cents >= 0),
  constraint tasting_packages_redeem_days_check check (redeem_valid_days >= 1)
);

create index idx_tasting_packages_district on public.tasting_packages (district);
create index idx_tasting_packages_status on public.tasting_packages (status);

drop trigger if exists trg_tasting_packages_updated_at on public.tasting_packages;
create trigger trg_tasting_packages_updated_at
  before update on public.tasting_packages
  for each row execute function public.set_updated_at();

create table public.tasting_package_shops (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.tasting_packages (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete restrict,
  tier text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint tasting_package_shops_tier_check check (tier in ('single', 'duo')),
  constraint tasting_package_shops_unique unique (package_id, org_id, tier)
);

create index idx_tasting_package_shops_package on public.tasting_package_shops (package_id);
create index idx_tasting_package_shops_org on public.tasting_package_shops (org_id);

create table public.tasting_package_items (
  id uuid primary key default gen_random_uuid(),
  package_shop_id uuid not null references public.tasting_package_shops (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  portion_index int not null default 1,
  created_at timestamptz not null default now(),
  constraint tasting_package_items_portion_check check (portion_index in (1, 2)),
  constraint tasting_package_items_unique unique (package_shop_id, portion_index)
);

create index idx_tasting_package_items_shop on public.tasting_package_items (package_shop_id);

create table public.tasting_package_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_id uuid not null references public.tasting_packages (id) on delete restrict,
  tier text not null,
  amount_cents int not null,
  currency text not null default 'hkd',
  status text not null default 'pending',
  stripe_checkout_session_id text not null,
  stripe_payment_intent_id text,
  mint_error text,
  minted_vouchers_json jsonb not null default '[]'::jsonb,
  stripe_checkout_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasting_package_purchases_tier_check check (tier in ('single', 'duo')),
  constraint tasting_package_purchases_status_check check (
    status in ('pending', 'paid', 'minted', 'failed', 'refunded')
  ),
  constraint tasting_package_purchases_amount_check check (amount_cents >= 0)
);

create unique index uq_tasting_package_purchases_stripe_session
  on public.tasting_package_purchases (stripe_checkout_session_id);

create unique index uq_tasting_package_purchases_open_success
  on public.tasting_package_purchases (user_id, package_id, tier)
  where status in ('pending', 'paid', 'minted');

create index idx_tasting_package_purchases_user on public.tasting_package_purchases (user_id);
create index idx_tasting_package_purchases_package on public.tasting_package_purchases (package_id);

drop trigger if exists trg_tasting_package_purchases_updated_at on public.tasting_package_purchases;
create trigger trg_tasting_package_purchases_updated_at
  before update on public.tasting_package_purchases
  for each row execute function public.set_updated_at();

-- Extend vouchers for tasting package mints
alter table public.vouchers
  add column if not exists tasting_package_purchase_id uuid references public.tasting_package_purchases (id) on delete set null,
  add column if not exists tasting_package_item_id uuid references public.tasting_package_items (id) on delete set null,
  add column if not exists menu_item_id uuid references public.menu_items (id) on delete set null;

create index if not exists idx_vouchers_tasting_purchase on public.vouchers (tasting_package_purchase_id);

-- ---------------------------------------------------------------------------
-- 2) Shop count enforcement
-- ---------------------------------------------------------------------------
create or replace function public.enforce_tasting_package_shop_limits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_count int;
  v_max int;
begin
  if new.tier = 'single' then
    v_max := 5;
  else
    v_max := 7;
  end if;

  select count(*)::int
  into v_count
  from public.tasting_package_shops tps
  where tps.package_id = new.package_id
    and tps.tier = new.tier
    and (tg_op = 'INSERT' or tps.id <> new.id);

  if v_count >= v_max then
    raise exception 'TASTING_PACKAGE_SHOP_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tasting_package_shops_limit on public.tasting_package_shops;
create trigger trg_tasting_package_shops_limit
  before insert or update on public.tasting_package_shops
  for each row execute function public.enforce_tasting_package_shop_limits();

-- ---------------------------------------------------------------------------
-- 3) RLS
-- ---------------------------------------------------------------------------
alter table public.tasting_packages enable row level security;
alter table public.tasting_package_shops enable row level security;
alter table public.tasting_package_items enable row level security;
alter table public.tasting_package_purchases enable row level security;

create policy tasting_packages_select_published
  on public.tasting_packages for select
  to anon, authenticated
  using (status = 'published');

create policy tasting_packages_super_admin_all
  on public.tasting_packages for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy tasting_package_shops_select_published
  on public.tasting_package_shops for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.tasting_packages tp
      where tp.id = package_id and tp.status = 'published'
    )
  );

create policy tasting_package_shops_super_admin_all
  on public.tasting_package_shops for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy tasting_package_items_select_published
  on public.tasting_package_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.tasting_package_shops tps
      join public.tasting_packages tp on tp.id = tps.package_id
      where tps.id = package_shop_id and tp.status = 'published'
    )
  );

create policy tasting_package_items_super_admin_all
  on public.tasting_package_items for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy tasting_package_purchases_select_own
  on public.tasting_package_purchases for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Mint RPC (service_role only)
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
  r record;
  v_code text;
  v_expires timestamptz;
  v_ids uuid[] := array[]::uuid[];
  v_codes text[] := array[]::text[];
  v_agg jsonb;
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
  if not found or pkg.status <> 'published' then
    raise exception 'PACKAGE_NOT_PUBLISHED' using errcode = 'P0001';
  end if;

  v_expires := now() + make_interval(days => greatest(pkg.redeem_valid_days, 1));

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

create or replace function public.finalize_tasting_package_after_checkout(p_checkout_session_id text)
returns table (voucher_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.tasting_package_purchases%rowtype;
begin
  select * into pay
  from public.tasting_package_purchases
  where stripe_checkout_session_id = p_checkout_session_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
  select m.voucher_id, m.code
  from public.mint_tasting_package_vouchers(pay.id) as m(voucher_id, code);
end;
$$;

revoke all on function public.finalize_tasting_package_after_checkout(text) from public;
grant execute on function public.finalize_tasting_package_after_checkout(text) to service_role;

-- ---------------------------------------------------------------------------
-- 5) Redeem: support tasting vouchers
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

  update public.vouchers
  set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where id = v_voucher.id;

  if v_voucher.tasting_package_item_id is not null then
    select
      o.org_name,
      tp.title,
      mi.item_name,
      'Tasting'::text,
      coalesce(nullif(trim(p.username), ''), 'Member')
    into v_org_name, v_campaign_title, v_item_name, v_offer_type, v_owner_username
    from public.vouchers v
    join public.orgs o on o.id = v.org_id
    join public.tasting_package_items tpi on tpi.id = v.tasting_package_item_id
    join public.menu_items mi on mi.id = tpi.menu_item_id
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

comment on table public.tasting_packages is 'Cross-shop tasting bundles with Single and Duo tiers.';
comment on function public.mint_tasting_package_vouchers(uuid) is 'Mint all vouchers for a paid tasting package purchase; service_role only.';
