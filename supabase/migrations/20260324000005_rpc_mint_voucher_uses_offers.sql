-- Update mint_voucher_atomic to use offers table (calendar offers only)
drop function if exists public.mint_voucher_atomic(uuid, text);

create or replace function public.mint_voucher_atomic(
  p_offer_id uuid,
  p_selected_coffee_type text
)
returns table(voucher_id uuid, code text, remaining integer, total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_offer_record record;
  v_minted_count integer;
  v_remaining integer;
  v_voucher_id uuid;
  v_code text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select id, org_id, quantity_limit, coffee_types
  into v_offer_record
  from public.offers
  where id = p_offer_id
    and source_type = 'calendar'
  for update;

  if v_offer_record.id is null then
    raise exception using errcode = 'P0001', message = 'OFFER_NOT_FOUND';
  end if;

  if v_offer_record.coffee_types is not null
     and array_length(v_offer_record.coffee_types, 1) > 0 then
    if p_selected_coffee_type is null or trim(p_selected_coffee_type) = '' then
      raise exception using errcode = 'P0001', message = 'MISSING_COFFEE_TYPE';
    end if;
    if not (p_selected_coffee_type = any(v_offer_record.coffee_types)) then
      raise exception using errcode = 'P0001', message = 'INVALID_COFFEE_TYPE';
    end if;
  end if;

  select count(*)
  into v_minted_count
  from public.vouchers
  where offer_id = p_offer_id
    and status in ('active', 'redeemed');

  if v_offer_record.quantity_limit is not null
     and v_minted_count >= v_offer_record.quantity_limit then
    raise exception using errcode = 'P0001', message = 'SOLD_OUT';
  end if;

  if exists (
    select 1
    from public.vouchers
    where offer_id = p_offer_id
      and owner_id = v_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_CLAIMED';
  end if;

  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_chars, floor(random()*62)::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.vouchers where code = v_code);
  end loop;

  begin
    insert into public.vouchers (offer_id, org_id, owner_id, code, selected_coffee_type, status)
    values (p_offer_id, v_offer_record.org_id, v_user_id, v_code, p_selected_coffee_type, 'active')
    returning id into v_voucher_id;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'ALREADY_CLAIMED';
  end;

  v_remaining := case
    when v_offer_record.quantity_limit is null then null
    else greatest(0, v_offer_record.quantity_limit - v_minted_count - 1)
  end;

  return query select
    v_voucher_id as voucher_id,
    v_code as code,
    v_remaining::integer as remaining,
    (v_minted_count + 1)::integer as total;
end;
$$;
