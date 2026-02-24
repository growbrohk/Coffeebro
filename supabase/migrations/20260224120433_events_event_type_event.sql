-- 1) If any existing rows have 'Events', convert to 'Event'
update public.events
set event_type = 'Event'
where event_type = 'Events';

-- 2) Drop old check constraint if it exists (name may vary; handle both)
alter table public.events
drop constraint if exists events_event_type_check;

alter table public.events
drop constraint if exists events_event_type_check1;

-- 3) Add new check constraint with canonical values
alter table public.events
add constraint events_event_type_check
check (event_type in ('$17Coffee', 'Event'));

-- 4) Set default to 'Event'
alter table public.events
alter column event_type set default 'Event';
