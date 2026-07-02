-- Tasting package affiliates: config table, purchase snapshots, tracking RPC updates.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
create table public.tasting_package_affiliates (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.tasting_packages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  split_pct numeric(5, 4) not null default 0.2000,
  ref_code text not null,
  created_at timestamptz not null default now(),
  constraint tasting_package_affiliates_unique unique (package_id, user_id),
  constraint tasting_package_affiliates_ref_code_unique unique (ref_code),
  constraint tasting_package_affiliates_split_pct_check check (split_pct > 0 and split_pct <= 1)
);

create index idx_tasting_package_affiliates_package
  on public.tasting_package_affiliates (package_id);

create index idx_tasting_package_affiliates_user
  on public.tasting_package_affiliates (user_id);

create index idx_tasting_package_affiliates_ref_code
  on public.tasting_package_affiliates (ref_code);

create or replace function public._generate_tasting_affiliate_ref_code()
returns trigger
language plpgsql
as $$
declare
  chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  candidate text;
  i int;
begin
  if new.ref_code is not null and trim(new.ref_code) <> '' then
    return new;
  end if;

  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.tasting_package_affiliates tpa where tpa.ref_code = candidate
    );
  end loop;

  new.ref_code := candidate;
  return new;
end;
$$;

drop trigger if exists trg_tasting_package_affiliates_ref_code on public.tasting_package_affiliates;
create trigger trg_tasting_package_affiliates_ref_code
  before insert on public.tasting_package_affiliates
  for each row execute function public._generate_tasting_affiliate_ref_code();

alter table public.tasting_package_purchases
  add column if not exists affiliate_user_id uuid references auth.users (id) on delete set null;

alter table public.tasting_package_purchases
  add column if not exists affiliate_split_pct numeric(5, 4);

create index if not exists idx_tpp_affiliate_user
  on public.tasting_package_purchases (affiliate_user_id, created_at desc)
  where affiliate_user_id is not null and status in ('paid', 'minted');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tasting_package_affiliates enable row level security;

create policy tasting_package_affiliates_super_admin_all
  on public.tasting_package_affiliates for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- Affiliate links for assigned users (Settings)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_tasting_affiliate_links()
returns table (
  package_id uuid,
  package_title text,
  split_pct numeric,
  ref_code text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    tp.id as package_id,
    tp.title as package_title,
    tpa.split_pct,
    tpa.ref_code
  from public.tasting_package_affiliates tpa
  join public.tasting_packages tp on tp.id = tpa.package_id
  where tpa.user_id = auth.uid()
    and tp.status = 'published'
    and tp.is_active = true
  order by tp.title;
end;
$$;

grant execute on function public.get_my_tasting_affiliate_links() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin purchase list — add affiliate columns (must drop to change return type)
-- ---------------------------------------------------------------------------
drop function if exists public.list_tasting_purchases(jsonb);

create or replace function public.list_tasting_purchases(p_filters jsonb default '{}'::jsonb)
returns table (
  purchase_id uuid,
  buyer_id uuid,
  buyer_name text,
  buyer_email text,
  package_id uuid,
  package_title text,
  tier text,
  amount_cents int,
  payment_status text,
  purchase_status text,
  created_at timestamptz,
  voucher_count bigint,
  redeemed_count bigint,
  affiliate_user_id uuid,
  affiliate_username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id uuid;
  v_tier text;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_buyer_search text;
  v_limit int;
  v_cursor_created_at timestamptz;
  v_cursor_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_package_id := nullif(p_filters->>'package_id', '')::uuid;
  v_tier := nullif(p_filters->>'tier', '');
  v_date_from := nullif(p_filters->>'date_from', '')::timestamptz;
  v_date_to := nullif(p_filters->>'date_to', '')::timestamptz;
  v_buyer_search := nullif(trim(p_filters->>'buyer_search'), '');
  v_limit := greatest(1, least(coalesce(nullif(p_filters->>'limit', '')::int, 10), 50));
  v_cursor_created_at := nullif(p_filters->>'cursor_created_at', '')::timestamptz;
  v_cursor_id := nullif(p_filters->>'cursor_id', '')::uuid;

  return query
  with vc as (
    select
      v.tasting_package_purchase_id as purchase_id,
      count(*)::bigint as voucher_count,
      count(*) filter (where v.status = 'redeemed')::bigint as redeemed_count
    from public.vouchers v
    where v.tasting_package_purchase_id is not null
    group by v.tasting_package_purchase_id
  )
  select
    p.id as purchase_id,
    p.user_id as buyer_id,
    coalesce(nullif(trim(pr.username), ''), 'Member') as buyer_name,
    au.email::text as buyer_email,
    p.package_id,
    tp.title as package_title,
    p.tier,
    p.amount_cents,
    p.status as payment_status,
    case
      when p.status = 'minted' and coalesce(vc.voucher_count, 0) > 0
        and coalesce(vc.redeemed_count, 0) = vc.voucher_count then 'Completed'
      when p.status = 'minted' then 'Active'
      else p.status
    end as purchase_status,
    p.created_at,
    coalesce(vc.voucher_count, 0)::bigint,
    coalesce(vc.redeemed_count, 0)::bigint,
    p.affiliate_user_id,
    nullif(trim(ap.username), '') as affiliate_username
  from public.tasting_package_purchases p
  join public.tasting_packages tp on tp.id = p.package_id
  left join public.profiles pr on pr.user_id = p.user_id
  left join auth.users au on au.id = p.user_id
  left join public.profiles ap on ap.user_id = p.affiliate_user_id
  left join vc on vc.purchase_id = p.id
  where p.status in ('paid', 'minted')
    and (v_package_id is null or p.package_id = v_package_id)
    and (v_tier is null or p.tier = v_tier)
    and (v_date_from is null or p.created_at >= v_date_from)
    and (v_date_to is null or p.created_at <= v_date_to)
    and (
      v_buyer_search is null
      or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
      or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
    )
    and (
      v_cursor_created_at is null
      or v_cursor_id is null
      or (p.created_at, p.id) < (v_cursor_created_at, v_cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit v_limit;
end;
$$;

grant execute on function public.list_tasting_purchases(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin redemption list — reduced shop split when affiliate attributed
-- ---------------------------------------------------------------------------
create or replace function public.list_tasting_redemptions(p_filters jsonb default '{}'::jsonb)
returns table (
  voucher_id uuid,
  voucher_code text,
  buyer_id uuid,
  buyer_name text,
  buyer_email text,
  package_id uuid,
  package_title text,
  tier text,
  org_id uuid,
  shop_name text,
  menu_item_id uuid,
  item_name text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  scanned_by_name text,
  shop_split_cents int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id uuid;
  v_tier text;
  v_org_id uuid;
  v_menu_item_id uuid;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_buyer_search text;
  v_limit int;
  v_cursor_redeemed_at timestamptz;
  v_cursor_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_package_id := nullif(p_filters->>'package_id', '')::uuid;
  v_tier := nullif(p_filters->>'tier', '');
  v_org_id := nullif(p_filters->>'org_id', '')::uuid;
  v_menu_item_id := nullif(p_filters->>'menu_item_id', '')::uuid;
  v_date_from := nullif(p_filters->>'date_from', '')::timestamptz;
  v_date_to := nullif(p_filters->>'date_to', '')::timestamptz;
  v_buyer_search := nullif(trim(p_filters->>'buyer_search'), '');
  v_limit := greatest(1, least(coalesce(nullif(p_filters->>'limit', '')::int, 10), 50));
  v_cursor_redeemed_at := nullif(p_filters->>'cursor_redeemed_at', '')::timestamptz;
  v_cursor_id := nullif(p_filters->>'cursor_id', '')::uuid;

  return query
  with vc as (
    select
      v2.tasting_package_purchase_id as purchase_id,
      count(*)::bigint as voucher_count
    from public.vouchers v2
    where v2.tasting_package_purchase_id is not null
    group by v2.tasting_package_purchase_id
  )
  select
    v.id as voucher_id,
    v.code as voucher_code,
    p.user_id as buyer_id,
    coalesce(nullif(trim(pr.username), ''), 'Member') as buyer_name,
    au.email::text as buyer_email,
    p.package_id,
    tp.title as package_title,
    p.tier,
    v.org_id,
    o.org_name as shop_name,
    v.menu_item_id,
    public._tasting_voucher_item_name(v.menu_item_id, v.menu_item_id_2) as item_name,
    v.status,
    v.created_at,
    v.redeemed_at,
    coalesce(nullif(trim(rp.username), ''), null)::text as scanned_by_name,
    greatest(
      round(
        p.amount_cents::numeric
        * (
          coalesce(p.coffee_shop_split_pct, tp.coffee_shop_split_pct, 0.6000)
          - coalesce(p.affiliate_split_pct, 0)
        )
        / nullif(vc.voucher_count, 0)
      ),
      0
    )::int as shop_split_cents
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.tasting_packages tp on tp.id = p.package_id
  join public.orgs o on o.id = v.org_id
  left join vc on vc.purchase_id = p.id
  left join public.profiles pr on pr.user_id = p.user_id
  left join auth.users au on au.id = p.user_id
  left join public.profiles rp on rp.user_id = v.redeemed_by
  where v.tasting_package_purchase_id is not null
    and v.status = 'redeemed'
    and v.redeemed_at is not null
    and p.status in ('paid', 'minted')
    and (v_package_id is null or p.package_id = v_package_id)
    and (v_tier is null or p.tier = v_tier)
    and (v_org_id is null or v.org_id = v_org_id)
    and (v_menu_item_id is null or v.menu_item_id = v_menu_item_id)
    and (v_date_from is null or v.redeemed_at >= v_date_from)
    and (v_date_to is null or v.redeemed_at <= v_date_to)
    and (
      v_buyer_search is null
      or lower(coalesce(pr.username, '')) like '%' || lower(v_buyer_search) || '%'
      or lower(coalesce(au.email::text, '')) like '%' || lower(v_buyer_search) || '%'
    )
    and (
      v_cursor_redeemed_at is null
      or v_cursor_id is null
      or (v.redeemed_at, v.id) < (v_cursor_redeemed_at, v_cursor_id)
    )
  order by v.redeemed_at desc, v.id desc
  limit v_limit;
end;
$$;

grant execute on function public.list_tasting_redemptions(jsonb) to authenticated;
