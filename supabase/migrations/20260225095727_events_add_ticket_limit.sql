-- Add ticket_limit column to events
-- null = unlimited, 0 = no tickets, positive = capacity

alter table public.events
add column if not exists ticket_limit integer null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_ticket_limit_check'
  ) then
    alter table public.events
    add constraint events_ticket_limit_check
    check (ticket_limit is null or ticket_limit >= 0);
  end if;
end $$;
