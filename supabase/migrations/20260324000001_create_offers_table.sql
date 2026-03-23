-- Unified offers table: replaces coffee_offers and treasure_reward
-- source_type: 'calendar' = standalone calendar offer, 'hunt' = treasure reward

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('calendar', 'hunt')),
  org_id uuid not null references public.orgs(id) on delete restrict,
  name text not null,
  offer_type text not null check (offer_type in ('free', '$17coffee', 'buy1get1free')),
  description text null,
  quantity_limit integer not null default 17,
  location text null,
  coffee_types text[] null,
  created_by uuid references auth.users(id) on delete set null,

  -- Calendar-specific (null when source_type = 'hunt')
  event_date date null,
  event_time text null,
  redeem_before_time text null,

  -- Hunt-specific (null when source_type = 'calendar')
  treasure_id uuid null references public.treasures(id) on delete cascade,
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

create index idx_offers_source_type on public.offers(source_type);
create index idx_offers_event_date on public.offers(event_date) where event_date is not null;
create index idx_offers_treasure_id on public.offers(treasure_id) where treasure_id is not null;
create index idx_offers_org_id on public.offers(org_id);

alter table public.offers enable row level security;

create policy "offers_select_all"
  on public.offers for select
  to authenticated
  using (true);

create policy "offers_insert_calendar"
  on public.offers for insert
  to authenticated
  with check (
    source_type = 'calendar'
    and created_by = auth.uid()
    and event_date is not null
  );

create policy "offers_insert_hunt"
  on public.offers for insert
  to authenticated
  with check (
    source_type = 'hunt'
    and treasure_id is not null
    and exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id and h.created_by = auth.uid()
    )
  );

create policy "offers_update_calendar"
  on public.offers for update
  to authenticated
  using (
    source_type = 'calendar' and created_by = auth.uid()
  );

create policy "offers_update_hunt"
  on public.offers for update
  to authenticated
  using (
    source_type = 'hunt'
    and exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id and h.created_by = auth.uid()
    )
  );

create policy "offers_delete_calendar"
  on public.offers for delete
  to authenticated
  using (source_type = 'calendar' and created_by = auth.uid());

create policy "offers_delete_hunt"
  on public.offers for delete
  to authenticated
  using (
    source_type = 'hunt'
    and exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id and h.created_by = auth.uid()
    )
  );
