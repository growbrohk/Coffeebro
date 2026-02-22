-- Fix function search path for update_event_registration_updated_at
CREATE OR REPLACE FUNCTION public.update_event_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;