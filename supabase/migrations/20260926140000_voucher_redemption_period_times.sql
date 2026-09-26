-- Fixed redemption windows store start/end instants (not calendar dates).
-- Same columns on return presets and campaign vouchers.

-- ---------------------------------------------------------------------------
-- 1) Preset timestamptz columns + backfill from dates
-- ---------------------------------------------------------------------------
alter table public.return_voucher_presets
  add column if not exists redeem_starts_at timestamptz,
  add column if not exists redeem_ends_at timestamptz;

update public.return_voucher_presets
set
  redeem_starts_at = redeem_starts_on::timestamp at time zone 'Asia/Hong_Kong',
  redeem_ends_at = (redeem_ends_on + 1)::timestamp at time zone 'Asia/Hong_Kong'
where redeem_starts_on is not null
  and redeem_ends_on is not null
  and redeem_starts_at is null
  and redeem_ends_at is null;

-- ---------------------------------------------------------------------------
-- 2) Mint return vouchers from the new columns (before dropping dates)
-- ---------------------------------------------------------------------------
create or replace function public._mint_return_voucher_for_owner(
  p_preset_id uuid,
  p_owner_id uuid,
  p_source_voucher_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preset public.return_voucher_presets%rowtype;
  v_minted int;
  v_code text;
  v_expires timestamptz;
  v_redeemable_from timestamptz;
begin
  if p_preset_id is null or p_owner_id is null then
    return null;
  end if;

  select * into v_preset
  from public.return_voucher_presets rvp
  where rvp.id = p_preset_id
  for update;

  if not found then
    return null;
  end if;

  if v_preset.redeem_starts_at is not null and v_preset.redeem_ends_at is not null then
    v_redeemable_from := v_preset.redeem_starts_at;
    v_expires := v_preset.redeem_ends_at;
    if now() >= v_expires then
      return null;
    end if;
  else
    v_redeemable_from := null;
    v_expires := now() + make_interval(days => v_preset.redeem_valid_days);
  end if;

  select count(*)::int into v_minted
  from public.vouchers v
  where v.return_voucher_preset_id = p_preset_id;

  if v_minted >= v_preset.quantity then
    return null;
  end if;

  v_code := public._generate_voucher_code();

  insert into public.vouchers (
    code,
    org_id,
    owner_id,
    return_voucher_preset_id,
    menu_item_id,
    minted_from_voucher_id,
    status,
    expires_at,
    redeemable_from
  ) values (
    v_code,
    v_preset.org_id,
    p_owner_id,
    v_preset.id,
    v_preset.menu_item_id,
    p_source_voucher_id,
    'active',
    v_expires,
    v_redeemable_from
  );

  return v_code;
end;
$$;

comment on function public._mint_return_voucher_for_owner(uuid, uuid, uuid) is
  'Mint one return voucher from a preset pool to p_owner_id. Returns code or null if pool exhausted or fixed period already ended.';

-- ---------------------------------------------------------------------------
-- 3) Drop date columns
-- ---------------------------------------------------------------------------
alter table public.return_voucher_presets
  drop constraint if exists return_voucher_presets_redeem_window_check;

alter table public.return_voucher_presets
  drop column if exists redeem_starts_on,
  drop column if exists redeem_ends_on;

alter table public.return_voucher_presets
  add constraint return_voucher_presets_redeem_window_check check (
    (redeem_starts_at is null and redeem_ends_at is null)
    or (
      redeem_starts_at is not null
      and redeem_ends_at is not null
      and redeem_ends_at > redeem_starts_at
    )
  );

comment on column public.return_voucher_presets.redeem_starts_at is
  'Start of a fixed redemption window. Null with redeem_ends_at means days-after-claim.';
comment on column public.return_voucher_presets.redeem_ends_at is
  'End of a fixed redemption window. Null with redeem_starts_at means days-after-claim.';

-- ---------------------------------------------------------------------------
-- 4) Campaign voucher windows
-- ---------------------------------------------------------------------------
alter table public.campaign_vouchers
  add column if not exists redeem_starts_at timestamptz,
  add column if not exists redeem_ends_at timestamptz;

alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_redeem_window_check;
alter table public.campaign_vouchers
  add constraint campaign_vouchers_redeem_window_check check (
    (redeem_starts_at is null and redeem_ends_at is null)
    or (
      redeem_starts_at is not null
      and redeem_ends_at is not null
      and redeem_ends_at > redeem_starts_at
    )
  );

comment on column public.campaign_vouchers.redeem_starts_at is
  'Start of a fixed redemption window. Null with redeem_ends_at means days-after-claim.';
comment on column public.campaign_vouchers.redeem_ends_at is
  'End of a fixed redemption window. Null with redeem_starts_at means days-after-claim.';

-- ---------------------------------------------------------------------------
-- 5) Campaign mint — snapshot window, never refuse for an ended period
-- ---------------------------------------------------------------------------
create or replace function public._mint_campaign_rewards_for_owner(
  p_campaign_id uuid,
  p_owner_id uuid
)
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
  v_starts timestamptz;
  v_ends timestamptz;
  v_code text;
  v_expires timestamptz;
  v_redeemable_from timestamptz;
  v_minted int := 0;
  v_need int;
  v_row record;
begin
  if p_owner_id is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select *
    into c
  from public.campaigns camp
  where camp.id = p_campaign_id
  for update;

  if not found then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if c.status <> 'published' then
    raise exception 'CAMPAIGN_NOT_PUBLISHED' using errcode = 'P0001';
  end if;

  if c.start_at is null or c.end_at is null or now() < c.start_at or now() > c.end_at then
    raise exception 'CAMPAIGN_NOT_IN_WINDOW' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.vouchers v
    where v.campaign_id = p_campaign_id and v.owner_id = p_owner_id
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
    if v_row.redeem_starts_at is not null and v_row.redeem_ends_at is not null then
      v_redeemable_from := v_row.redeem_starts_at;
      v_expires := v_row.redeem_ends_at;
    else
      v_redeemable_from := null;
      v_expires := now() + make_interval(days => greatest(coalesce(v_row.redeem_valid_days, 7), 1));
    end if;

    insert into public.vouchers (
      org_id,
      owner_id,
      code,
      status,
      expires_at,
      redeemable_from,
      campaign_id,
      campaign_voucher_id
    ) values (
      c.org_id,
      p_owner_id,
      v_code,
      'active',
      v_expires,
      v_redeemable_from,
      p_campaign_id,
      v_row.id
    )
    returning vouchers.id, vouchers.code into id, code;
    return next;
    return;
  end if;

  for i in 1..v_need loop
    select cv.id, cv.redeem_valid_days, cv.redeem_starts_at, cv.redeem_ends_at
    into v_cv_id, v_days, v_starts, v_ends
    from public.campaign_vouchers cv
    where cv.campaign_id = p_campaign_id
      and (cv.quantity - coalesce((
        select count(*)::int from public.vouchers v where v.campaign_voucher_id = cv.id
      ), 0)) > 0
    order by random()
    limit 1;

    exit when v_cv_id is null;

    v_code := public._generate_voucher_code();
    if v_starts is not null and v_ends is not null then
      v_redeemable_from := v_starts;
      v_expires := v_ends;
    else
      v_redeemable_from := null;
      v_expires := now() + make_interval(days => greatest(coalesce(v_days, 7), 1));
    end if;

    insert into public.vouchers (
      org_id,
      owner_id,
      code,
      status,
      expires_at,
      redeemable_from,
      campaign_id,
      campaign_voucher_id
    ) values (
      c.org_id,
      p_owner_id,
      v_code,
      'active',
      v_expires,
      v_redeemable_from,
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

revoke all on function public._mint_campaign_rewards_for_owner(uuid, uuid) from public;
grant execute on function public._mint_campaign_rewards_for_owner(uuid, uuid) to service_role;
