-- Paid campaign claims: Stripe checkout ledger, pricing helper, paid mint path, payment gate on free RPCs.

-- ---------------------------------------------------------------------------
-- 1) Ledger table
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_claim_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  claim_channel text not null,
  hunt_qr_payload text null,
  stripe_checkout_session_id text not null,
  stripe_payment_intent_id text null,
  amount_cents int not null,
  currency text not null default 'hkd',
  status text not null default 'pending',
  mint_error text null,
  minted_vouchers_json jsonb not null default '[]'::jsonb,
  stripe_checkout_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_claim_payments_channel_check check (claim_channel in ('grab', 'hunt')),
  constraint campaign_claim_payments_status_check check (
    status in ('pending', 'paid', 'minted', 'failed', 'refunded')
  ),
  constraint campaign_claim_payments_amount_check check (amount_cents >= 0)
);

create unique index if not exists uq_campaign_claim_payments_stripe_session
  on public.campaign_claim_payments (stripe_checkout_session_id);

create unique index if not exists uq_campaign_claim_payments_open_success
  on public.campaign_claim_payments (user_id, campaign_id)
  where status in ('pending', 'paid', 'minted');

create index if not exists idx_campaign_claim_payments_user on public.campaign_claim_payments (user_id);
create index if not exists idx_campaign_claim_payments_campaign on public.campaign_claim_payments (campaign_id);
create index if not exists idx_campaign_claim_payments_pi on public.campaign_claim_payments (stripe_payment_intent_id);

drop trigger if exists trg_campaign_claim_payments_updated_at on public.campaign_claim_payments;
create trigger trg_campaign_claim_payments_updated_at
  before update on public.campaign_claim_payments
  for each row execute function public.set_updated_at();

alter table public.campaign_claim_payments enable row level security;

drop policy if exists "campaign_claim_payments_select_own" on public.campaign_claim_payments;
create policy "campaign_claim_payments_select_own"
  on public.campaign_claim_payments for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) Random pools: paid offer types disallowed (MVP)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_random_campaign_vouchers_free()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rm text;
begin
  select c.reward_mode
  into rm
  from public.campaigns c
  where c.id = new.campaign_id;

  if rm = 'random' and new.offer_type is distinct from 'free' then
    raise exception 'RANDOM_CAMPAIGN_PAID_OFFER_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaign_vouchers_random_free_only on public.campaign_vouchers;
create trigger trg_campaign_vouchers_random_free_only
  before insert or update of campaign_id, offer_type on public.campaign_vouchers
  for each row execute function public.enforce_random_campaign_vouchers_free();

-- ---------------------------------------------------------------------------
-- 3) Pricing (HKD cents) — service_role / internal only
-- ---------------------------------------------------------------------------
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

  select cv.offer_type, mi.base_price
  into v_offer, v_base
  from public.campaign_vouchers cv
  join public.menu_items mi on mi.id = cv.menu_item_id
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

  if v_offer = 'b1g1' then
    v_cents := round(coalesce(v_base, 0) * 100)::int;
    if v_cents <= 0 then
      raise exception 'INVALID_B1G1_PRICE' using errcode = 'P0001';
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

-- ---------------------------------------------------------------------------
-- 4) Core mint for an explicit owner (Stripe / service path); not for direct client calls
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
  v_code text;
  v_expires timestamptz;
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
      p_owner_id,
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
      p_owner_id,
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

revoke all on function public._mint_campaign_rewards_for_owner(uuid, uuid) from public;
grant execute on function public._mint_campaign_rewards_for_owner(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5) Free / instant-claim path: gate paid campaigns
-- ---------------------------------------------------------------------------
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
      and cv.offer_type is distinct from 'free'
  ) then
    raise exception 'PAYMENT_REQUIRED' using errcode = 'P0001';
  end if;

  return query
  select m.id, m.code
  from public._mint_campaign_rewards_for_owner(p_campaign_id, auth.uid()) as m(id, code);
end;
$$;

revoke all on function public._mint_campaign_rewards(uuid) from public;

-- ---------------------------------------------------------------------------
-- 6) Finalize after Stripe (webhook, service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_campaign_claim_after_checkout(
  p_checkout_session_id text
)
returns table (voucher_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.campaign_claim_payments%rowtype;
  r record;
  v_ids uuid[] := array[]::uuid[];
  v_codes text[] := array[]::text[];
  v_agg jsonb;
begin
  select *
  into pay
  from public.campaign_claim_payments
  where stripe_checkout_session_id = p_checkout_session_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if pay.status = 'minted' then
    return query
    select (e->>'vid')::uuid, e->>'code'
    from jsonb_array_elements(pay.minted_vouchers_json) e;
    return;
  end if;

  if pay.status not in ('pending', 'paid') then
    raise exception 'PAYMENT_NOT_FINALIZABLE' using errcode = 'P0001';
  end if;

  for r in
    select m.id, m.code
    from public._mint_campaign_rewards_for_owner(pay.campaign_id, pay.user_id) as m(id, code)
  loop
    v_ids := array_append(v_ids, r.id);
    v_codes := array_append(v_codes, r.code);
    voucher_id := r.id;
    code := r.code;
    return next;
  end loop;

  select coalesce(
    jsonb_agg(jsonb_build_object('vid', x.id, 'code', x.code)),
    '[]'::jsonb
  )
  into v_agg
  from unnest(v_ids, v_codes) as x(id, code);

  update public.campaign_claim_payments
  set
    status = 'minted',
    minted_vouchers_json = v_agg,
    mint_error = null,
    updated_at = now()
  where id = pay.id;
end;
$$;

revoke all on function public.finalize_campaign_claim_after_checkout(text) from public;
grant execute on function public.finalize_campaign_claim_after_checkout(text) to service_role;

comment on table public.campaign_claim_payments is 'Stripe Checkout sessions for paid campaign claims; mint runs in finalize_campaign_claim_after_checkout.';
comment on function public.compute_campaign_claim_amount_cents(uuid) is 'HKD cents + requires_payment for fixed-mode vouchers.';
comment on function public.finalize_campaign_claim_after_checkout(text) is 'Idempotent mint after successful Checkout; service_role only.';
