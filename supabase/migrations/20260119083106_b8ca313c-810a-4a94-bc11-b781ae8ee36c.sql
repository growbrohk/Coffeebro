-- Drop the security definer view and recreate as regular view
DROP VIEW IF EXISTS public.leaderboard;

-- Create leaderboard view without security definer (default is security invoker)
CREATE VIEW public.leaderboard 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.username,
    p.created_at,
    COUNT(dr.id) AS run_count
FROM public.profiles p
LEFT JOIN public.daily_runs dr ON p.user_id = dr.user_id 
    AND EXTRACT(MONTH FROM dr.run_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM dr.run_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY p.id, p.username, p.created_at
ORDER BY run_count DESC, p.created_at ASC;

-- Add RLS policy for daily_runs to allow leaderboard to count runs (public read for aggregation)
CREATE POLICY "Allow public read for leaderboard aggregation"
ON public.daily_runs
FOR SELECT
USING (true);