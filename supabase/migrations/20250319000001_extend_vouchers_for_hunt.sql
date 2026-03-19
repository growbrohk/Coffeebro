-- Extend vouchers table for Hunt Voucher Mode
-- Hunt vouchers have source_type='hunt_stop', treasure_reward_id, hunt_claim_id; coffee_offer_id is null

alter table public.vouchers
  add column if not exists source_type text not null default 'coffee_offer'
    check (source_type in ('coffee_offer', 'hunt_stop'));

alter table public.vouchers
  add column if not exists treasure_reward_id uuid references public.treasure_reward(id) on delete set null;

alter table public.vouchers
  add column if not exists hunt_claim_id uuid references public.hunt_claims(id) on delete set null;

-- Make coffee_offer_id nullable for hunt vouchers
alter table public.vouchers
  alter column coffee_offer_id drop not null;

-- Drop the unique constraint that required one voucher per offer per user
-- (hunt vouchers can have multiple per user; coffee_offer vouchers still enforced in mint_voucher_atomic)
drop index if exists public.uq_vouchers_offer_owner;

-- Add partial unique: one coffee_offer voucher per user per offer
create unique index uq_vouchers_offer_owner
  on public.vouchers(coffee_offer_id, owner_id)
  where coffee_offer_id is not null;
