-- Optional cleanup: drop daily_runs if it exists
DO $$ BEGIN
  IF to_regclass('public.daily_runs') IS NOT NULL THEN
    DROP TABLE public.daily_runs CASCADE;
  END IF;
END $$;

-- Create daily_coffees table
CREATE TABLE public.daily_coffees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  rating INT NULL,
  coffee_type TEXT NULL,
  coffee_type_other TEXT NULL,
  place TEXT NULL,
  diary TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, coffee_date),
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10))
);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_daily_coffees_updated_at ON public.daily_coffees;
CREATE TRIGGER set_daily_coffees_updated_at
BEFORE UPDATE ON public.daily_coffees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.daily_coffees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY daily_coffees_select_own
ON public.daily_coffees
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY daily_coffees_insert_own
ON public.daily_coffees
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_coffees_update_own
ON public.daily_coffees
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_coffees_delete_own
ON public.daily_coffees
FOR DELETE
USING (auth.uid() = user_id);

-- Update function to get percentage of users who had coffee today
CREATE OR REPLACE FUNCTION public.get_today_coffee_percentage()
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE 
            WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(DISTINCT user_id) FROM daily_coffees WHERE coffee_date = CURRENT_DATE)::NUMERIC 
                / (SELECT COUNT(*) FROM profiles)::NUMERIC * 100, 
                0
            )
        END;
$$;

-- Recreate leaderboard view to use daily_coffees
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = on) AS
SELECT 
    p.id,
    p.user_id,
    p.username,
    p.created_at,
    COUNT(dc.id) AS run_count
FROM public.profiles p
LEFT JOIN public.daily_coffees dc ON p.user_id = dc.user_id 
    AND EXTRACT(MONTH FROM dc.coffee_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM dc.coffee_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY p.id, p.user_id, p.username, p.created_at
ORDER BY run_count DESC, p.created_at ASC;

-- Create authenticated read view for daily_coffees (similar to daily_runs_authed_read)
CREATE VIEW public.daily_coffees_authed_read 
WITH (security_invoker = on) AS
SELECT 
    user_id,
    coffee_date
  FROM public.daily_coffees;

GRANT SELECT ON public.daily_coffees_authed_read TO authenticated;
REVOKE ALL ON public.daily_coffees_authed_read FROM anon;
