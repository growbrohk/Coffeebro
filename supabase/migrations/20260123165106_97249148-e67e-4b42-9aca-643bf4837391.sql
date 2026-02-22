-- Recreate leaderboard view with security_invoker to fix security warning
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.created_at,
  COUNT(dr.id) as run_count
FROM public.profiles p
LEFT JOIN public.daily_runs dr ON p.user_id = dr.user_id
GROUP BY p.id, p.user_id, p.username, p.created_at
ORDER BY run_count DESC, p.created_at ASC;