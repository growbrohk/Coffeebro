-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_runs table
CREATE TABLE public.daily_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, run_date)
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_runs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles (for leaderboard)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Profiles: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Daily runs: Users can view their own runs
CREATE POLICY "Users can view their own runs"
ON public.daily_runs
FOR SELECT
USING (auth.uid() = user_id);

-- Daily runs: Users can insert their own runs
CREATE POLICY "Users can insert their own runs"
ON public.daily_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a view for the public leaderboard (current month runs count)
CREATE OR REPLACE VIEW public.leaderboard AS
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

-- Function to get percentage of users who ran today
CREATE OR REPLACE FUNCTION public.get_today_run_percentage()
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
                (SELECT COUNT(DISTINCT user_id) FROM daily_runs WHERE run_date = CURRENT_DATE)::NUMERIC 
                / (SELECT COUNT(*) FROM profiles)::NUMERIC * 100, 
                0
            )
        END;
$$;

-- Function to get total users count
CREATE OR REPLACE FUNCTION public.get_total_users()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER FROM profiles;
$$;