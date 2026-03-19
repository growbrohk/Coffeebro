-- Add offer_type to treasure_reward
alter table public.treasure_reward
  add column if not exists offer_type text not null default 'free'
    check (offer_type in ('free', '$17coffee', 'buy1get1free'));
