-- Add assigned_to column to event_tickets
-- This tracks which user the ticket is assigned to (on registration)
-- redeemed_by is separate and tracks who actually redeemed it

alter table public.event_tickets
add column if not exists assigned_to uuid null references auth.users(id) on delete set null;

create index if not exists idx_event_tickets_assigned_to on public.event_tickets(assigned_to);

-- Update RLS to allow users to select their own assigned tickets
drop policy if exists "Users can view their assigned tickets" on public.event_tickets;

create policy "Users can view their assigned tickets"
on public.event_tickets
for select
to authenticated
using (
  assigned_to = auth.uid()
  or public.can_manage_event(auth.uid(), event_id)
);
