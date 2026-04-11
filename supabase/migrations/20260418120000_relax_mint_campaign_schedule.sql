-- Allow claims when schedule bounds are unset; only enforce bounds that exist.
-- Previous logic rejected any campaign with start_at or end_at null.

create or replace function public._mint_campaign_rewards(p_campaign_id uuid)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns%rowtype;
  i int;
  v_cv_id uuid;
  v_days int;
  v_code text;
  v_expires timestamptz;
  v_minted int := 0;
  v_need int;
  v_row record;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select *
  into c
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if c.status <> 'published' then
    raise exception 'CAMPAIGN_NOT_PUBLISHED' using errcode = 'P0001';
  end if;

  if c.start_at is not null and now() < c.start_at then
    raise exception 'CAMPAIGN_NOT_STARTED' using errcode = 'P0001';
  end if;

  if c.end_at is not null and now() > c.end_at then
    raise exception 'CAMPAIGN_ENDED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.vouchers v
    where v.campaign_id = p_campaign_id and v.owner_id = auth.uid()
  ) then
    raise exception 'ALREADY_CLAIMED' using errcode = 'P0001';
  end if;

  perform 1
  from public.campaign_vouchers cv
  where cv.campaign_id = p_campaign_id
  for update of cv;

  v_need := greatest(c.reward_per_action, 1);

  if c.reward_mode = 'fixed' then
    select
      cv.*,
      (cv.quantity - coalesce((
        select count(*)::int from public.vouchers v where v.campaign_voucher_id = cv.id
      ), 0))::int as rem
    into v_row
    from public.campaign_vouchers cv
    where cv.campaign_id = p_campaign_id
    limit 1;

    if v_row is null then
      raise exception 'NO_VOUCHER_DEFINITION' using errcode = 'P0001';
    end if;

    if (v_row.rem) < 1 then
      raise exception 'POOL_EMPTY' using errcode = 'P0001';
    end if;

    v_code := public._generate_voucher_code();
    v_expires := now() + make_interval(days => greatest(coalesce(v_row.redeem_valid_days, 7), 1));

    insert into public.vouchers (
      org_id,
      owner_id,
      code,
      status,
      expires_at,
      campaign_id,
      campaign_voucher_id
    ) values (
      c.org_id,
      auth.uid(),
      v_code,
      'active',
      v_expires,
      p_campaign_id,
      v_row.id
    )
    returning vouchers.id, vouchers.code into id, code;
    return next;
    return;
  end if;

  for i in 1..v_need loop
    select cv.id, cv.redeem_valid_days
    into v_cv_id, v_days
    from public.campaign_vouchers cv
    where cv.campaign_id = p_campaign_id
      and (cv.quantity - coalesce((
        select count(*)::int from public.vouchers v where v.campaign_voucher_id = cv.id
      ), 0)) > 0
    order by random()
    limit 1;

    exit when v_cv_id is null;

    v_code := public._generate_voucher_code();
    v_expires := now() + make_interval(days => greatest(coalesce(v_days, 7), 1));

    insert into public.vouchers (
      org_id,
      owner_id,
      code,
      status,
      expires_at,
      campaign_id,
      campaign_voucher_id
    ) values (
      c.org_id,
      auth.uid(),
      v_code,
      'active',
      v_expires,
      p_campaign_id,
      v_cv_id
    )
    returning vouchers.id, vouchers.code into id, code;

    return next;
    v_minted := v_minted + 1;
  end loop;

  if v_minted = 0 then
    raise exception 'POOL_EMPTY' using errcode = 'P0001';
  end if;

  return;
end;
$$;
