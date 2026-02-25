-- Create event_tickets table
-- One row per ticket; code + QR for redemption (same pattern as vouchers)

create table public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'redeemed', 'void')),
  redeemed_at timestamptz null,
  redeemed_by uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_event_tickets_event_id on public.event_tickets(event_id);
create unique index uq_event_tickets_code on public.event_tickets(code);

alter table public.event_tickets enable row level security;

-- Helper: can user manage event (host/admin of event's org)
-- Uses events table (post-rename); same logic as can_view_event_participants
create or replace function public.can_manage_event(_user_id uuid, _event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(_user_id, 'super_admin')
    or (
      public.has_role(_user_id, 'run_club_host')
      and exists (
        select 1
        from public.events e
        where e.id = _event_id
          and e.org_id is not null
          and public.is_org_host(_user_id, e.org_id)
      )
    )
$$;

-- RLS: hosts/admins can select/insert/update/delete tickets for events they manage
create policy "Hosts can manage event tickets"
on public.event_tickets
for all
to authenticated
using (
  public.can_manage_event(auth.uid(), event_id)
)
with check (
  public.can_manage_event(auth.uid(), event_id)
);
