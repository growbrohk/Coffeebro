-- RPC: claim_treasure_atomic
-- Atomically claims a treasure by qr_code_id, mints vouchers for each treasure_reward
-- Returns status table; prevents duplicate claims

create or replace function public.claim_treasure_atomic(p_qr_code_id text)
returns table(status text, message text, voucher_data jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_treasure record;
  v_hunt record;
  v_claim_id uuid;
  v_reward record;
  v_code text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_vouchers jsonb := '[]'::jsonb;
  v_voucher_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select 'NOT_AUTHORIZED'::text, 'Sign in required'::text, null::jsonb;
    return;
  end if;

  if p_qr_code_id is null or trim(p_qr_code_id) = '' then
    return query select 'INVALID_INPUT'::text, 'QR code required'::text, null::jsonb;
    return;
  end if;

  -- Lock treasure row
  select t.*, t.hunt_id as h_id
  into v_treasure
  from public.treasures t
  where t.qr_code_id = trim(p_qr_code_id)
  for update;

  if not found then
    return query select 'NOT_FOUND'::text, 'Invalid or unknown treasure'::text, null::jsonb;
    return;
  end if;

  -- Get hunt
  select * into v_hunt
  from public.hunts
  where id = v_treasure.hunt_id;

  if v_hunt.status <> 'active' then
    return query select 'HUNT_INACTIVE'::text, 'This hunt is not active'::text, null::jsonb;
    return;
  end if;

  if v_hunt.ends_at is not null and now() > v_hunt.ends_at then
    return query select 'HUNT_ENDED'::text, 'This hunt has ended'::text, null::jsonb;
    return;
  end if;

  -- User must have joined the hunt
  if not exists (
    select 1 from public.hunt_participants
    where hunt_id = v_treasure.hunt_id and user_id = v_user_id
  ) then
    return query select 'NOT_JOINED'::text, 'Join the hunt first'::text, null::jsonb;
    return;
  end if;

  -- Already claimed
  if exists (
    select 1 from public.hunt_claims
    where treasure_id = v_treasure.id and user_id = v_user_id
  ) then
    return query select 'ALREADY_CLAIMED'::text, 'You already claimed this treasure'::text, null::jsonb;
    return;
  end if;

  -- Insert claim
  insert into public.hunt_claims (treasure_id, user_id)
  values (v_treasure.id, v_user_id)
  returning id into v_claim_id;

  -- Mint voucher for each treasure_reward
  for v_reward in
    select * from public.treasure_reward
    where treasure_id = v_treasure.id
    order by sort_order
  loop
    -- Generate unique code
    loop
      v_code := '';
      for i in 1..8 loop
        v_code := v_code || substr(v_chars, floor(random()*62)::int + 1, 1);
      end loop;
      exit when not exists (select 1 from public.vouchers where code = v_code);
    end loop;

    insert into public.vouchers (
      coffee_offer_id,
      org_id,
      owner_id,
      code,
      status,
      source_type,
      treasure_reward_id,
      hunt_claim_id
    )
    values (
      null,
      v_reward.org_id,
      v_user_id,
      v_code,
      'active',
      'hunt_stop',
      v_reward.id,
      v_claim_id
    )
    returning id into v_voucher_id;

    v_vouchers := v_vouchers || jsonb_build_object('id', v_voucher_id, 'code', v_code);
  end loop;

  return query select 'OK'::text, 'Treasure claimed!'::text, v_vouchers;
end;
$$;
