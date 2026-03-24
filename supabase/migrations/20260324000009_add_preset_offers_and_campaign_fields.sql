-- Preset offers are reusable offer definitions owned by host organizations.
create table if not exists public.preset_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  offer_type text not null check (offer_type in ('free', '$17coffee', 'buy1get1free')),
  description text null,
  coffee_types text[] null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_preset_offers_org_id on public.preset_offers(org_id);
create index if not exists idx_preset_offers_created_by on public.preset_offers(created_by);

alter table public.preset_offers enable row level security;

create policy "preset_offers_select_all"
  on public.preset_offers for select
  to authenticated
  using (true);

create policy "preset_offers_insert_creator"
  on public.preset_offers for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "preset_offers_update_creator"
  on public.preset_offers for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "preset_offers_delete_creator"
  on public.preset_offers for delete
  to authenticated
  using (created_by = auth.uid());

-- Offers become campaign/listing records and reference reusable preset offers.
alter table public.offers
  add column if not exists preset_offer_id uuid null references public.preset_offers(id) on delete set null,
  add column if not exists redeem_duration_days integer not null default 7,
  add column if not exists campaign_title text null;

alter table public.offers
  add constraint offers_redeem_duration_days_positive
  check (redeem_duration_days between 1 and 90);

create index if not exists idx_offers_preset_offer_id on public.offers(preset_offer_id) where preset_offer_id is not null;

-- Hunt campaign allocation strategy lives on treasure.
alter table public.treasures
  add column if not exists allocation_mode text not null default 'fixed' check (allocation_mode in ('fixed', 'random')),
  add column if not exists per_scan_voucher_amount integer not null default 1,
  add column if not exists allow_duplicate_vouchers boolean not null default false;

alter table public.treasures
  add constraint treasures_per_scan_voucher_amount_positive
  check (per_scan_voucher_amount between 1 and 20);

