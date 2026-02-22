-- Create a read-only view for authenticated users to see daily runs
-- This view exposes only user_id and run_date (no sensitive data)
CREATE VIEW public.daily_runs_authed_read 
WITH (security_invoker = on)
AS
  SELECT user_id, run_date
  FROM public.daily_runs;

-- Grant SELECT only to authenticated users (no anon access)
GRANT SELECT ON public.daily_runs_authed_read TO authenticated;

-- Revoke all access from anon role (explicit denial)
REVOKE ALL ON public.daily_runs_authed_read FROM anon;