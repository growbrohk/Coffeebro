-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.run_club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_event_user UNIQUE (event_id, user_id),
  CONSTRAINT valid_status CHECK (status IN ('registered', 'cancel'))
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_event_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_registration_updated_at();

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view their own registrations"
  ON public.event_registrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own registrations"
  ON public.event_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
  ON public.event_registrations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX idx_event_registrations_event_user ON public.event_registrations(event_id, user_id);
CREATE INDEX idx_event_registrations_user ON public.event_registrations(user_id);