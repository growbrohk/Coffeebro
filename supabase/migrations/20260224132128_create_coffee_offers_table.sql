create table public.coffee_offers (
  id uuid primary key default gen_random_uuid(),

  org_id uuid not null references orgs(id),
  created_by uuid not null references auth.users(id),

  name text not null,
  event_date date not null,
  event_time text null,
  location text null,
  description text null,

  created_at timestamptz not null default now()
);

create index idx_coffee_offers_date
on public.coffee_offers (event_date);

alter table public.coffee_offers enable row level security;

create policy "coffee_offers_select_all"
on public.coffee_offers
for select
to public
using (true);

create policy "coffee_offers_insert_own"
on public.coffee_offers
for insert
to authenticated
with check (created_by = auth.uid());
