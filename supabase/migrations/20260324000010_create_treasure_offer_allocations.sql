-- Allocation rows define which hunt offers a treasure can mint.
create table if not exists public.treasure_offer_allocations (
  id uuid primary key default gen_random_uuid(),
  treasure_id uuid not null references public.treasures(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  sort_order integer not null default 0,
  fixed_count integer not null default 1,
  allocation_weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (treasure_id, offer_id)
);

alter table public.treasure_offer_allocations
  add constraint treasure_offer_allocations_fixed_count_positive
  check (fixed_count between 1 and 20);

alter table public.treasure_offer_allocations
  add constraint treasure_offer_allocations_allocation_weight_positive
  check (allocation_weight between 1 and 1000);

create index if not exists idx_treasure_offer_allocations_treasure_id
  on public.treasure_offer_allocations(treasure_id);

create index if not exists idx_treasure_offer_allocations_offer_id
  on public.treasure_offer_allocations(offer_id);

alter table public.treasure_offer_allocations enable row level security;

create policy "treasure_offer_allocations_select_visible"
  on public.treasure_offer_allocations for select
  to authenticated
  using (
    exists (
      select 1
      from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id
        and (h.status = 'active' or h.created_by = auth.uid())
    )
  );

create policy "treasure_offer_allocations_insert_creator"
  on public.treasure_offer_allocations for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id
        and h.created_by = auth.uid()
    )
    and exists (
      select 1
      from public.offers o
      where o.id = offer_id
        and o.treasure_id = treasure_id
        and o.source_type = 'hunt'
    )
  );

create policy "treasure_offer_allocations_update_creator"
  on public.treasure_offer_allocations for update
  to authenticated
  using (
    exists (
      select 1
      from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id
        and h.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id
        and h.created_by = auth.uid()
    )
  );

create policy "treasure_offer_allocations_delete_creator"
  on public.treasure_offer_allocations for delete
  to authenticated
  using (
    exists (
      select 1
      from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id
        and h.created_by = auth.uid()
    )
  );

