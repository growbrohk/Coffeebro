-- Add claim_limit, starts_at, ends_at to treasures
alter table public.treasures
  add column if not exists claim_limit integer null;

alter table public.treasures
  add column if not exists starts_at timestamptz null;

alter table public.treasures
  add column if not exists ends_at timestamptz null;
