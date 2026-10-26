-- A buy-one-get-one whose menu price is HK$0 is a free grab.
-- Missing menu price still fails, so an unknown price is not given away.

create or replace function public.compute_campaign_claim_amount_cents(p_campaign_id uuid)
returns table (amount_cents int, requires_payment boolean, currency text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.campaigns%rowtype;
  v_offer text;
  v_base numeric(10, 2);
  v_digits text;
  v_cents int;
begin
  currency := 'hkd';

  select * into c from public.campaigns where id = p_campaign_id;
  if not found then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if c.reward_mode = 'random' then
    amount_cents := 0;
    requires_payment := false;
    return next;
    return;
  end if;

  select
    cv.offer_type,
    (
      select max(mi.base_price)
      from public.menu_items mi
      where mi.id = cv.menu_item_id
         or mi.id = any(coalesce(cv.menu_item_ids, '{}'::uuid[]))
    )
  into v_offer, v_base
  from public.campaign_vouchers cv
  where cv.campaign_id = p_campaign_id
  order by cv.sort_order, cv.created_at
  limit 1;

  if v_offer is null then
    raise exception 'NO_VOUCHER_DEFINITION' using errcode = 'P0001';
  end if;

  if v_offer = 'free' then
    amount_cents := 0;
    requires_payment := false;
    return next;
    return;
  end if;

  if v_offer ~ '^(percent|dollar)_discount_' then
    amount_cents := 0;
    requires_payment := false;
    return next;
    return;
  end if;

  if v_offer = 'b1g1' then
    if v_base is null then
      raise exception 'INVALID_B1G1_PRICE' using errcode = 'P0001';
    end if;
    v_cents := round(v_base * 100)::int;
    if v_cents <= 0 then
      amount_cents := 0;
      requires_payment := false;
      return next;
      return;
    end if;
    amount_cents := v_cents;
    requires_payment := true;
    return next;
    return;
  end if;

  v_digits := substring(v_offer from 'fixed_price_(\d+)');
  if v_digits is null then
    raise exception 'UNKNOWN_OFFER_TYPE' using errcode = 'P0001';
  end if;

  v_cents := (v_digits::int) * 100;
  amount_cents := v_cents;
  requires_payment := true;
  return next;
end;
$$;

revoke all on function public.compute_campaign_claim_amount_cents(uuid) from public;
grant execute on function public.compute_campaign_claim_amount_cents(uuid) to service_role;

-- Instant claim: every voucher row must be free, a discount, or a HK$0 buy-one-get-one.
-- Checked per row because fixed-mode minting does not pick vouchers by sort order.
create or replace function public._mint_campaign_rewards(p_campaign_id uuid)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.campaign_vouchers cv
    where cv.campaign_id = p_campaign_id
      and not (
        cv.offer_type = 'free'
        or cv.offer_type ~ '^(percent|dollar)_discount_'
        or (
          cv.offer_type = 'b1g1'
          and coalesce((
            select max(mi.base_price)
            from public.menu_items mi
            where mi.id = cv.menu_item_id
               or mi.id = any(coalesce(cv.menu_item_ids, '{}'::uuid[]))
          ), 1) <= 0
        )
      )
  ) then
    raise exception 'PAYMENT_REQUIRED' using errcode = 'P0001';
  end if;

  return query
  select m.id, m.code
  from public._mint_campaign_rewards_for_owner(p_campaign_id, auth.uid()) as m(id, code);
end;
$$;

revoke all on function public._mint_campaign_rewards(uuid) from public;
