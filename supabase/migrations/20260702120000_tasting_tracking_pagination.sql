-- Tasting tracking: keyset pagination + redeemed-only redemption lists.

-- ---------------------------------------------------------------------------
-- Indexes for keyset pagination
-- ---------------------------------------------------------------------------
create index if not exists idx_tpp_created_keyset
  on public.tasting_package_purchases (created_at desc, id desc)
  where status in ('paid', 'minted');

create index if not exists idx_vouchers_redeemed_keyset
  on public.vouchers (redeemed_at desc, id desc)
  where status = 'redeemed' and tasting_package_purchase_id is not null;

create index if not exists idx_vouchers_org_redeemed_keyset
  on public.vouchers (org_id, redeemed_at desc, id desc)
  where status = 'redeemed' and tasting_package_purchase_id is not null;

-- ---------------------------------------------------------------------------
-- Admin purchase list (paid/minted only, keyset paginated)
-- ---------------------------------------------------------------------------
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
  redeemed_count bigint
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
    coalesce(vc.redeemed_count, 0)::bigint
  from public.tasting_package_purchases p
  join public.tasting_packages tp on tp.id = p.package_id
  left join public.profiles pr on pr.user_id = p.user_id
  left join auth.users au on au.id = p.user_id
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
-- Admin redemption list (redeemed only, keyset paginated)
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
  scanned_by_name text
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
    coalesce(nullif(trim(rp.username), ''), null)::text as scanned_by_name
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.tasting_packages tp on tp.id = p.package_id
  join public.orgs o on o.id = v.org_id
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

-- ---------------------------------------------------------------------------
-- Host redemption history (redeemed only, keyset paginated)
-- ---------------------------------------------------------------------------
drop function if exists public.list_host_tasting_redemptions(uuid, uuid, timestamptz, timestamptz);

create or replace function public.list_host_tasting_redemptions(
  p_org_id uuid,
  p_package_id uuid default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_limit int default 10,
  p_cursor_redeemed_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  voucher_id uuid,
  redeemed_at timestamptz,
  buyer_name text,
  package_title text,
  tier text,
  item_name text,
  status text,
  scanned_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_scan_vouchers_for_org(auth.uid(), p_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 10), 50));

  return query
  select
    v.id as voucher_id,
    v.redeemed_at,
    coalesce(nullif(trim(pr.username), ''), 'Member') as buyer_name,
    tp.title as package_title,
    p.tier,
    public._tasting_voucher_item_name(v.menu_item_id, v.menu_item_id_2) as item_name,
    v.status,
    coalesce(nullif(trim(rp.username), ''), null)::text as scanned_by_name
  from public.vouchers v
  join public.tasting_package_purchases p on p.id = v.tasting_package_purchase_id
  join public.tasting_packages tp on tp.id = p.package_id
  left join public.profiles pr on pr.user_id = p.user_id
  left join public.profiles rp on rp.user_id = v.redeemed_by
  where v.tasting_package_purchase_id is not null
    and v.org_id = p_org_id
    and v.status = 'redeemed'
    and v.redeemed_at is not null
    and p.status in ('paid', 'minted')
    and (p_package_id is null or p.package_id = p_package_id)
    and (p_date_from is null or v.redeemed_at >= p_date_from)
    and (p_date_to is null or v.redeemed_at <= p_date_to)
    and (
      p_cursor_redeemed_at is null
      or p_cursor_id is null
      or (v.redeemed_at, v.id) < (p_cursor_redeemed_at, p_cursor_id)
    )
  order by v.redeemed_at desc, v.id desc
  limit v_limit;
end;
$$;

grant execute on function public.list_host_tasting_redemptions(
  uuid, uuid, timestamptz, timestamptz, int, timestamptz, uuid
) to authenticated;
