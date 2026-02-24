-- RPC function: mint_voucher_atomic
-- Atomically mints a voucher with concurrency safety and coffee type validation

create or replace function public.mint_voucher_atomic(
  p_offer_id uuid,
  p_selected_coffee_type text
)
returns table(voucher_id uuid, remaining integer, total integer)
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
begin
  -- Require authentication
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  -- Lock the coffee_offers row FOR UPDATE to prevent concurrent oversells
  select 
    id,
    org_id,
    quantity_limit,
    coffee_types
  into v_offer_record
  from public.coffee_offers
  where id = p_offer_id
  for update;

  -- Check if offer exists
  if v_offer_record.id is null then
    raise exception using errcode = 'P0001', message = 'OFFER_NOT_FOUND';
  end if;

  -- Validate coffee type selection
  if v_offer_record.coffee_types is not null 
     and array_length(v_offer_record.coffee_types, 1) > 0 then
    -- Coffee types are defined, so selection is required
    if p_selected_coffee_type is null or trim(p_selected_coffee_type) = '' then
      raise exception using errcode = 'P0001', message = 'MISSING_COFFEE_TYPE';
    end if;
    
    -- Check if selected type is in the allowed list
    if not (p_selected_coffee_type = any(v_offer_record.coffee_types)) then
      raise exception using errcode = 'P0001', message = 'INVALID_COFFEE_TYPE';
    end if;
  end if;
  -- If coffee_types is null or empty, allow p_selected_coffee_type to be null (backward compatibility)

  -- Count existing vouchers for this offer (active or redeemed)
  select count(*)
  into v_minted_count
  from public.vouchers
  where coffee_offer_id = p_offer_id
    and status in ('active', 'redeemed');

  -- Enforce quantity limit (no oversell)
  if v_offer_record.quantity_limit is not null 
     and v_minted_count >= v_offer_record.quantity_limit then
    raise exception using errcode = 'P0001', message = 'SOLD_OUT';
  end if;

  -- Check if user already has a voucher for this offer
  -- The unique constraint will also catch this, but we can provide a clearer error
  if exists (
    select 1
    from public.vouchers
    where coffee_offer_id = p_offer_id
      and owner_id = v_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_CLAIMED';
  end if;

  -- Insert the voucher
  -- Wrap in exception handler to catch unique constraint violations
  begin
    insert into public.vouchers (
      coffee_offer_id,
      org_id,
      owner_id,
      selected_coffee_type,
      status
    )
    values (
      p_offer_id,
      v_offer_record.org_id,
      v_user_id,
      p_selected_coffee_type,
      'active'
    )
    returning id into v_voucher_id;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'ALREADY_CLAIMED';
  end;

  -- Calculate remaining
  v_remaining := case
    when v_offer_record.quantity_limit is null then null
    else greatest(0, v_offer_record.quantity_limit - v_minted_count - 1)
  end;

  -- Return result
  return query select
    v_voucher_id as voucher_id,
    v_remaining::integer as remaining,
    (v_minted_count + 1)::integer as total;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.mint_voucher_atomic(uuid, text) to authenticated;
