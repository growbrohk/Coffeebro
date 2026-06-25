-- Duo tasting vouchers: one voucher per shop (both drinks snapshotted), not one per drink.

alter table public.vouchers
  add column if not exists menu_item_id_2 uuid references public.menu_items (id) on delete restrict;

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

  if pay.tier = 'duo' then
    for r in
      select
        tps.org_id,
        max(case when tpi.portion_index = 1 then tpi.id end) as item_id,
        max(case when tpi.portion_index = 1 then tpi.menu_item_id end) as menu_id_1,
        max(case when tpi.portion_index = 2 then tpi.menu_item_id end) as menu_id_2
      from public.tasting_package_shops tps
      join public.tasting_package_items tpi on tpi.package_shop_id = tps.id
      where tps.package_id = pay.package_id
        and tps.tier = 'duo'
      group by tps.id, tps.org_id, tps.sort_order
      having count(tpi.id) >= 2
        and max(case when tpi.portion_index = 1 then tpi.id end) is not null
        and max(case when tpi.portion_index = 1 then tpi.menu_item_id end) is not null
        and max(case when tpi.portion_index = 2 then tpi.menu_item_id end) is not null
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
