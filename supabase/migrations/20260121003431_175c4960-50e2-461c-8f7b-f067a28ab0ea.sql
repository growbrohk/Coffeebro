-- Create run_club_events table
CREATE TABLE public.run_club_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.run_club_events ENABLE ROW LEVEL SECURITY;

-- Public read access for everyone (anon + authenticated)
CREATE POLICY "Events are publicly readable"
ON public.run_club_events
FOR SELECT
USING (true);

-- Create index for efficient date-based queries
CREATE INDEX idx_run_club_events_date ON public.run_club_events(event_date);