-- Create vouchers table
-- A voucher represents 1 redeemable unit minted by a user for a coffee offer

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),

  coffee_offer_id uuid not null references public.coffee_offers(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete cascade,

  selected_coffee_type text null,

  status text not null default 'active',
  -- allowed: active | redeemed | expired | refunded

  created_at timestamptz not null default now(),
  redeemed_at timestamptz null,
  expires_at timestamptz null
);

create index idx_vouchers_offer_id on public.vouchers(coffee_offer_id);
create index idx_vouchers_owner_id on public.vouchers(owner_id);
create unique index uq_vouchers_offer_owner on public.vouchers(coffee_offer_id, owner_id);

alter table public.vouchers enable row level security;

-- RLS policies
create policy "vouchers_select_own"
on public.vouchers for select
using (owner_id = auth.uid());

create policy "vouchers_insert_own"
on public.vouchers for insert
with check (owner_id = auth.uid());
