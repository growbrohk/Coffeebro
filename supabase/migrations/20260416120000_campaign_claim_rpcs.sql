-- Phase 3: claim_campaign_voucher, claim_hunt_campaign, list_campaign_participants, richer redeem_voucher_atomic.

-- ---------------------------------------------------------------------------
-- Helpers: random voucher code (uppercase alphanumeric)
-- ---------------------------------------------------------------------------
create or replace function public._generate_voucher_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    exit when not exists (select 1 from public.vouchers v where v.code = v_code);
  end loop;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core: mint from a campaign (grab or hunt entry points)
-- ---------------------------------------------------------------------------
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

  if c.start_at is null or c.end_at is null or now() < c.start_at or now() > c.end_at then
    raise exception 'CAMPAIGN_NOT_IN_WINDOW' using errcode = 'P0001';
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

create or replace function public.claim_campaign_voucher(p_campaign_id uuid)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id and c.campaign_type = 'grab'
  ) then
    raise exception 'NOT_GRAB_CAMPAIGN' using errcode = 'P0001';
  end if;

  return query select m.id, m.code from public._mint_campaign_rewards(p_campaign_id) as m(id, code);
end;
$$;

create or replace function public.claim_hunt_campaign(p_qr_payload text)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select c.id into v_id
  from public.campaigns c
  where c.qr_payload = p_qr_payload
    and c.campaign_type = 'hunt';

  if v_id is null then
    raise exception 'HUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query select m.id, m.code from public._mint_campaign_rewards(v_id) as m(id, code);
end;
$$;

comment on function public.claim_campaign_voucher(uuid) is 'Grab campaign: mint voucher(s) for auth user.';
comment on function public.claim_hunt_campaign(text) is 'Hunt campaign: mint by campaigns.qr_payload.';

grant execute on function public.claim_campaign_voucher(uuid) to authenticated;
grant execute on function public.claim_hunt_campaign(text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_campaign_participants
-- ---------------------------------------------------------------------------
create or replace function public.list_campaign_participants(p_campaign_id uuid)
returns table (
  voucher_id uuid,
  owner_id uuid,
  owner_name text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select c.org_id into v_org_id
  from public.campaigns c
  where c.id = p_campaign_id;

  if v_org_id is null then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    public.has_role(auth.uid(), 'super_admin')
    or public.can_manage_org_offers(auth.uid(), v_org_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    v.id as voucher_id,
    v.owner_id,
    coalesce(p.username, '') as owner_name,
    v.status,
    v.created_at,
    v.redeemed_at,
    v.code
  from public.vouchers v
  left join public.profiles p on p.user_id = v.owner_id
  where v.campaign_id = p_campaign_id
  order by v.created_at asc;
end;
$$;

grant execute on function public.list_campaign_participants(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- redeem_voucher_atomic — add display fields (campaign + menu item)
-- ---------------------------------------------------------------------------
-- OUT parameter shape changed; CREATE OR REPLACE cannot alter return row type.
drop function if exists public.redeem_voucher_atomic(text);

create function public.redeem_voucher_atomic(p_code text)
returns table (
  status text,
  message text,
  voucher_id uuid,
  org_name text,
  campaign_title text,
  item_name text,
  offer_type text
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
begin
  if auth.uid() is null then
    return query select 'NOT_AUTHORIZED'::text, 'Not signed in'::text, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;

  select *
  into v_voucher
  from public.vouchers
  where code = p_code
  for update;

  if not found then
    return query select 'NOT_FOUND'::text, 'Invalid code'::text, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;

  v_ok := public.has_role(auth.uid(), 'super_admin')
    or public.can_scan_vouchers_for_org(auth.uid(), v_voucher.org_id);

  if not v_ok then
    return query select 'NOT_AUTHORIZED'::text, 'Staff only'::text, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;

  if v_voucher.expires_at is not null and now() > v_voucher.expires_at then
    return query select 'EXPIRED'::text, 'Voucher expired'::text, v_voucher.id, null::text, null::text, null::text, null::text;
    return;
  end if;

  if v_voucher.status <> 'active' then
    return query select 'ALREADY_REDEEMED'::text, 'Already redeemed'::text, v_voucher.id, null::text, null::text, null::text, null::text;
    return;
  end if;

  update public.vouchers
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid()
  where id = v_voucher.id;

  select o.org_name, c.display_title, mi.item_name, cv.offer_type
  into v_org_name, v_campaign_title, v_item_name, v_offer_type
  from public.vouchers v
  join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  join public.campaigns c on c.id = v.campaign_id
  join public.menu_items mi on mi.id = cv.menu_item_id
  join public.orgs o on o.id = v.org_id
  where v.id = v_voucher.id;

  return query select 'OK'::text, 'Redeemed'::text, v_voucher.id, v_org_name, v_campaign_title, v_item_name, v_offer_type;
end;
$$;

grant execute on function public.redeem_voucher_atomic(text) to authenticated;
