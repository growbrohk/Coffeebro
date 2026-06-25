-- Fix duo mint pivot: PostgreSQL has no max(uuid); cast through text.

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

-- Re-mint purchases that failed due to max(uuid).
do $$
declare
  r record;
begin
  for r in
    select id
    from public.tasting_package_purchases
    where status = 'failed'
      and mint_error ilike '%max(uuid)%'
  loop
    begin
      perform public.replay_tasting_package_mint(r.id);
    exception
      when others then
        raise notice 'replay_tasting_package_mint skipped for %: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;
