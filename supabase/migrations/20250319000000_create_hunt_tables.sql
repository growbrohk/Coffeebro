-- Hunt Voucher Mode: hunts, treasures, hunt_participants, hunt_claims, treasure_reward

-- hunts: host-created hunt campaigns
create table public.hunts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended')),
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now()
);

create index idx_hunts_status on public.hunts(status);
create index idx_hunts_org_id on public.hunts(org_id);
create index idx_hunts_created_by on public.hunts(created_by);

alter table public.hunts enable row level security;

create policy "hunts_select_all"
  on public.hunts for select
  to authenticated
  using (true);

create policy "hunts_insert_host"
  on public.hunts for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.user_access ua
      where ua.user_id = auth.uid()
        and ua.role in ('super_admin', 'run_club_host')
    )
  );

create policy "hunts_update_creator"
  on public.hunts for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- treasures: pinned stops on the map, each with a unique QR code
create table public.treasures (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null references public.hunts(id) on delete cascade,
  qr_code_id text not null unique,
  name text not null,
  description text null,
  lat numeric null,
  lng numeric null,
  address text null,
  sort_order int not null default 0
);

create index idx_treasures_hunt_id on public.treasures(hunt_id);
create unique index uq_treasures_qr_code_id on public.treasures(qr_code_id);

alter table public.treasures enable row level security;

create policy "treasures_select_hunt_visible"
  on public.treasures for select
  to authenticated
  using (
    exists (
      select 1 from public.hunts h
      where h.id = hunt_id
        and (h.status = 'active' or h.created_by = auth.uid())
    )
  );

create policy "treasures_insert_creator"
  on public.treasures for insert
  to authenticated
  with check (
    exists (
      select 1 from public.hunts h
      where h.id = hunt_id and h.created_by = auth.uid()
    )
  );

create policy "treasures_update_creator"
  on public.treasures for update
  to authenticated
  using (
    exists (
      select 1 from public.hunts h
      where h.id = hunt_id and h.created_by = auth.uid()
    )
  );

create policy "treasures_delete_creator"
  on public.treasures for delete
  to authenticated
  using (
    exists (
      select 1 from public.hunts h
      where h.id = hunt_id and h.created_by = auth.uid()
    )
  );

-- treasure_reward: voucher definitions per treasure (1+ per treasure)
create table public.treasure_reward (
  id uuid primary key default gen_random_uuid(),
  treasure_id uuid not null references public.treasures(id) on delete cascade,
  title text not null,
  description text null,
  org_id uuid not null references public.orgs(id) on delete restrict,
  sort_order int not null default 0
);

create index idx_treasure_reward_treasure_id on public.treasure_reward(treasure_id);

alter table public.treasure_reward enable row level security;

create policy "treasure_reward_select_treasure_visible"
  on public.treasure_reward for select
  to authenticated
  using (
    exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id
        and (h.status = 'active' or h.created_by = auth.uid())
    )
  );

create policy "treasure_reward_insert_creator"
  on public.treasure_reward for insert
  to authenticated
  with check (
    exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id and h.created_by = auth.uid()
    )
  );

create policy "treasure_reward_update_creator"
  on public.treasure_reward for update
  to authenticated
  using (
    exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id and h.created_by = auth.uid()
    )
  );

create policy "treasure_reward_delete_creator"
  on public.treasure_reward for delete
  to authenticated
  using (
    exists (
      select 1 from public.treasures t
      join public.hunts h on h.id = t.hunt_id
      where t.id = treasure_id and h.created_by = auth.uid()
    )
  );

-- hunt_participants: users who joined a hunt (required before claiming)
create table public.hunt_participants (
  hunt_id uuid not null references public.hunts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (hunt_id, user_id)
);

create index idx_hunt_participants_user_id on public.hunt_participants(user_id);

alter table public.hunt_participants enable row level security;

create policy "hunt_participants_select_own_or_hunt"
  on public.hunt_participants for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.hunts h
      where h.id = hunt_id and h.created_by = auth.uid()
    )
  );

create policy "hunt_participants_insert_own"
  on public.hunt_participants for insert
  to authenticated
  with check (user_id = auth.uid());

-- hunt_claims: one claim per user per treasure (prevents duplicate claims)
create table public.hunt_claims (
  id uuid primary key default gen_random_uuid(),
  treasure_id uuid not null references public.treasures(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (treasure_id, user_id)
);

create index idx_hunt_claims_treasure_id on public.hunt_claims(treasure_id);
create index idx_hunt_claims_user_id on public.hunt_claims(user_id);

alter table public.hunt_claims enable row level security;

create policy "hunt_claims_select_own"
  on public.hunt_claims for select
  to authenticated
  using (user_id = auth.uid());

create policy "hunt_claims_insert_via_rpc"
  on public.hunt_claims for insert
  to authenticated
  with check (user_id = auth.uid());
