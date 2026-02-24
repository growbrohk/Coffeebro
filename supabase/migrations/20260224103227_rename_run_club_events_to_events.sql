-- Rename table from run_club_events to events
ALTER TABLE public.run_club_events
RENAME TO events;

-- Also rename the existing index to keep naming clean
ALTER INDEX IF EXISTS public.idx_run_club_events_date
RENAME TO idx_events_date;
