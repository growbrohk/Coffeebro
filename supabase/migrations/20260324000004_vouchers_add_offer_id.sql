-- Add offer_id to vouchers and migrate data
alter table public.vouchers
  add column if not exists offer_id uuid references public.offers(id) on delete set null;

-- Migrate calendar vouchers (coffee_offer_id = offer id, we preserved it)
update public.vouchers
set offer_id = coffee_offer_id
where coffee_offer_id is not null;

-- Migrate hunt vouchers via mapping
update public.vouchers v
set offer_id = m.offer_id
from public._migrate_tr_to_offer m
where v.treasure_reward_id = m.treasure_reward_id;

create index if not exists idx_vouchers_offer_id on public.vouchers(offer_id) where offer_id is not null;

-- Add partial unique for calendar: one voucher per user per offer (only for calendar offers)
drop index if exists public.uq_vouchers_offer_owner;
create unique index uq_vouchers_offer_owner
  on public.vouchers(offer_id, owner_id)
  where offer_id is not null;
