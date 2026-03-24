-- Update claim_treasure_atomic to use offers table
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
  v_code text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_vouchers jsonb := '[]'::jsonb;
  v_voucher_id uuid;
  v_expires_at timestamptz;
  v_draw_count integer;
  v_selected_offer_ids uuid[] := '{}'::uuid[];
  v_working_offer_id uuid;
  v_total_weight integer;
  v_pick integer;
  v_running integer;
  v_row record;
  v_offer record;
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

  select t.*, t.hunt_id as h_id
  into v_treasure
  from public.treasures t
  where t.qr_code_id = trim(p_qr_code_id)
  for update;

  if not found then
    return query select 'NOT_FOUND'::text, 'Invalid or unknown treasure'::text, null::jsonb;
    return;
  end if;

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

  if not exists (
    select 1 from public.hunt_participants
    where hunt_id = v_treasure.hunt_id and user_id = v_user_id
  ) then
    return query select 'NOT_JOINED'::text, 'Join the hunt first'::text, null::jsonb;
    return;
  end if;

  if exists (
    select 1 from public.hunt_claims
    where treasure_id = v_treasure.id and user_id = v_user_id
  ) then
    return query select 'ALREADY_CLAIMED'::text, 'You already claimed this treasure'::text, null::jsonb;
    return;
  end if;

  insert into public.hunt_claims (treasure_id, user_id)
  values (v_treasure.id, v_user_id)
  returning id into v_claim_id;

  if coalesce(v_treasure.allocation_mode, 'fixed') = 'fixed' then
    for v_row in
      select
        ta.offer_id,
        ta.fixed_count,
        o.org_id,
        o.redeem_duration_days
      from public.treasure_offer_allocations ta
      join public.offers o on o.id = ta.offer_id
      where ta.treasure_id = v_treasure.id
        and ta.is_active = true
        and o.source_type = 'hunt'
      order by ta.sort_order, ta.created_at, ta.id
    loop
      if not coalesce(v_treasure.allow_duplicate_vouchers, false) then
        if v_row.fixed_count > 1 then
          return query select 'INVALID_CONFIG'::text, 'Fixed count > 1 requires duplicates enabled'::text, null::jsonb;
          return;
        end if;
      end if;

      for v_draw_count in 1..v_row.fixed_count loop
        -- Enforce offer quantity limit as remaining allocation source of truth
        if exists (
          select 1
          from public.offers o2
          where o2.id = v_row.offer_id
            and o2.quantity_limit is not null
            and (
              select count(*)
              from public.vouchers v
              where v.offer_id = o2.id
                and v.status in ('active', 'redeemed')
            ) >= o2.quantity_limit
        ) then
          continue;
        end if;

        loop
          v_code := '';
          for i in 1..8 loop
            v_code := v_code || substr(v_chars, floor(random()*62)::int + 1, 1);
          end loop;
          exit when not exists (select 1 from public.vouchers where code = v_code);
        end loop;

        v_expires_at := now() + make_interval(days => greatest(1, coalesce(v_row.redeem_duration_days, 7)));

        insert into public.vouchers (
          offer_id,
          org_id,
          owner_id,
          code,
          status,
          source_type,
          hunt_claim_id,
          expires_at
        )
        values (
          v_row.offer_id,
          v_row.org_id,
          v_user_id,
          v_code,
          'active',
          'hunt_stop',
          v_claim_id,
          v_expires_at
        )
        returning id into v_voucher_id;

        v_vouchers := v_vouchers || jsonb_build_object('id', v_voucher_id, 'code', v_code);
      end loop;
    end loop;
  else
    v_draw_count := greatest(1, coalesce(v_treasure.per_scan_voucher_amount, 1));

    for i in 1..v_draw_count loop
      v_working_offer_id := null;
      v_total_weight := 0;

      for v_row in
        select
          ta.offer_id,
          ta.allocation_weight
        from public.treasure_offer_allocations ta
        join public.offers o on o.id = ta.offer_id
        where ta.treasure_id = v_treasure.id
          and ta.is_active = true
          and o.source_type = 'hunt'
          and (
            o.quantity_limit is null
            or (
              select count(*)
              from public.vouchers v
              where v.offer_id = o.id
                and v.status in ('active', 'redeemed')
            ) < o.quantity_limit
          )
          and (
            coalesce(v_treasure.allow_duplicate_vouchers, false) = true
            or not (ta.offer_id = any(v_selected_offer_ids))
          )
        order by ta.sort_order, ta.created_at, ta.id
      loop
        v_total_weight := v_total_weight + greatest(1, coalesce(v_row.allocation_weight, 1));
      end loop;

      if v_total_weight <= 0 then
        exit;
      end if;

      v_pick := floor(random() * v_total_weight)::int + 1;
      v_running := 0;

      for v_row in
        select
          ta.offer_id,
          ta.allocation_weight
        from public.treasure_offer_allocations ta
        join public.offers o on o.id = ta.offer_id
        where ta.treasure_id = v_treasure.id
          and ta.is_active = true
          and o.source_type = 'hunt'
          and (
            o.quantity_limit is null
            or (
              select count(*)
              from public.vouchers v
              where v.offer_id = o.id
                and v.status in ('active', 'redeemed')
            ) < o.quantity_limit
          )
          and (
            coalesce(v_treasure.allow_duplicate_vouchers, false) = true
            or not (ta.offer_id = any(v_selected_offer_ids))
          )
        order by ta.sort_order, ta.created_at, ta.id
      loop
        v_running := v_running + greatest(1, coalesce(v_row.allocation_weight, 1));
        if v_pick <= v_running then
          v_working_offer_id := v_row.offer_id;
          exit;
        end if;
      end loop;

      if v_working_offer_id is null then
        exit;
      end if;

      v_selected_offer_ids := array_append(v_selected_offer_ids, v_working_offer_id);
    end loop;

    for v_offer in
      select id, org_id, redeem_duration_days
      from public.offers
      where id = any(v_selected_offer_ids)
    loop
      loop
        v_code := '';
        for i in 1..8 loop
          v_code := v_code || substr(v_chars, floor(random()*62)::int + 1, 1);
        end loop;
        exit when not exists (select 1 from public.vouchers where code = v_code);
      end loop;

      v_expires_at := now() + make_interval(days => greatest(1, coalesce(v_offer.redeem_duration_days, 7)));

      insert into public.vouchers (
        offer_id,
        org_id,
        owner_id,
        code,
        status,
        source_type,
        hunt_claim_id,
        expires_at
      )
      values (
        v_offer.id,
        v_offer.org_id,
        v_user_id,
        v_code,
        'active',
        'hunt_stop',
        v_claim_id,
        v_expires_at
      )
      returning id into v_voucher_id;

      v_vouchers := v_vouchers || jsonb_build_object('id', v_voucher_id, 'code', v_code);
    end loop;
  end if;

  if jsonb_array_length(v_vouchers) = 0 then
    return query select 'POOL_EXHAUSTED'::text, 'No vouchers available for this treasure'::text, null::jsonb;
    return;
  end if;

  return query select 'OK'::text, 'Treasure claimed!'::text, v_vouchers;
end;
$$;
