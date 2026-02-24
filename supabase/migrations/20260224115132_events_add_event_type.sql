-- Add event_type column with default value
alter table public.events
add column if not exists event_type text not null default 'Events';

-- Make name nullable
alter table public.events
alter column name drop not null;

-- Add check constraint for event_type
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_event_type_check') then
    alter table public.events
    add constraint events_event_type_check
    check (event_type in ('$17Coffee', 'Events'));
  end if;
end $$;
