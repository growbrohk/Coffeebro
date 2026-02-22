-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'run_club_host', 'user');

-- 2. Create user_access table
CREATE TABLE public.user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for user_access
CREATE POLICY "Users can view their own access"
ON public.user_access
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Helper function to check if user can host events
CREATE OR REPLACE FUNCTION public.can_host_event(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'run_club_host')
  )
$$;

-- 7. Add created_by column to run_club_events
ALTER TABLE public.run_club_events
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- 8. Add INSERT policy for run_club_events (only hosts/admins can insert)
CREATE POLICY "Hosts and admins can create events"
ON public.run_club_events
FOR INSERT
WITH CHECK (public.can_host_event(auth.uid()));