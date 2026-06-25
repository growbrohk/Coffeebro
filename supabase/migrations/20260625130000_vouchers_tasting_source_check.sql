-- Allow tasting-package vouchers alongside campaign and loyalty vouchers.

alter table public.vouchers
  drop constraint if exists vouchers_campaign_or_loyalty_check;

alter table public.vouchers
  add constraint vouchers_source_check check (
    (
      campaign_id is not null
      and campaign_voucher_id is not null
      and loyalty_catalog_id is null
      and tasting_package_purchase_id is null
      and tasting_package_item_id is null
    )
    or (
      loyalty_catalog_id is not null
      and campaign_id is null
      and campaign_voucher_id is null
      and tasting_package_purchase_id is null
      and tasting_package_item_id is null
    )
    or (
      tasting_package_purchase_id is not null
      and tasting_package_item_id is not null
      and campaign_id is null
      and campaign_voucher_id is null
      and loyalty_catalog_id is null
    )
  );

-- Replay mint for purchases that failed due to the old constraint (service_role only).
create or replace function public.replay_tasting_package_mint(p_purchase_id uuid)
returns table (voucher_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.tasting_package_purchases%rowtype;
  target_id uuid;
begin
  select * into pay
  from public.tasting_package_purchases
  where id = p_purchase_id;

  if not found then
    raise exception 'PURCHASE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if pay.status = 'minted' then
    return query
    select m.voucher_id, m.code
    from public.mint_tasting_package_vouchers(p_purchase_id) as m(voucher_id, code);
    return;
  end if;

  select p.id
  into target_id
  from public.tasting_package_purchases p
  where p.user_id = pay.user_id
    and p.package_id = pay.package_id
    and p.tier = pay.tier
    and p.status in ('pending', 'paid', 'minted')
  order by
    case p.status
      when 'paid' then 1
      when 'pending' then 2
      when 'minted' then 3
    end,
    p.created_at desc
  limit 1;

  if target_id is not null then
    return query
    select m.voucher_id, m.code
    from public.mint_tasting_package_vouchers(target_id) as m(voucher_id, code);
    return;
  end if;

  if pay.status = 'failed' then
    update public.tasting_package_purchases
    set status = 'paid', mint_error = null, updated_at = now()
    where id = p_purchase_id;
    target_id := p_purchase_id;
  elsif pay.status in ('pending', 'paid') then
    target_id := p_purchase_id;
  else
    raise exception 'PURCHASE_NOT_FINALIZABLE' using errcode = 'P0001';
  end if;

  return query
  select m.voucher_id, m.code
  from public.mint_tasting_package_vouchers(target_id) as m(voucher_id, code);
end;
$$;

revoke all on function public.replay_tasting_package_mint(uuid) from public;
grant execute on function public.replay_tasting_package_mint(uuid) to service_role;

comment on function public.replay_tasting_package_mint(uuid) is
  'Re-mint vouchers for a failed tasting purchase after constraint fix; service_role only.';

-- One-time recovery: re-mint purchases that failed due to the old check constraint.
do $$
declare
  r record;
begin
  for r in
    select id
    from public.tasting_package_purchases
    where status = 'failed'
      and (
        mint_error ilike '%vouchers_campaign_or_loyalty_check%'
        or mint_error ilike '%vouchers_source_check%'
        or mint_error ilike '%check constraint%'
      )
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
