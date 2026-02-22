-- Create org_hosts table for explicit host assignments
CREATE TABLE public.org_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'host')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_user UNIQUE (org_id, user_id)
);

-- Enable RLS on org_hosts
ALTER TABLE public.org_hosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_hosts table

-- SELECT: super_admin can see all, users can see their own assignments
CREATE POLICY "Users can view accessible org_hosts"
ON public.org_hosts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR user_id = auth.uid()
);

-- INSERT/UPDATE/DELETE: Only super_admin can manage org_hosts
CREATE POLICY "Super admins can manage org_hosts"
ON public.org_hosts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create index for efficient lookups
CREATE INDEX idx_org_hosts_org_id ON public.org_hosts(org_id);
CREATE INDEX idx_org_hosts_user_id ON public.org_hosts(user_id);

-- Security definer function: check if user is a host for an org
CREATE OR REPLACE FUNCTION public.is_org_host(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_hosts
    WHERE org_id = _org_id
      AND user_id = _user_id
  )
$$;

-- Security definer function: check if user can create events for an org
CREATE OR REPLACE FUNCTION public.can_create_event_for_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'super_admin')
    OR (
      public.has_role(_user_id, 'run_club_host')
      AND public.is_org_host(_user_id, _org_id)
    )
$$;

-- Update can_view_org function to use org_hosts
CREATE OR REPLACE FUNCTION public.can_view_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'super_admin') 
    OR public.is_org_host(_user_id, _org_id)
$$;

-- Update can_view_event_participants function to use org_hosts
CREATE OR REPLACE FUNCTION public.can_view_event_participants(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'super_admin')
    OR (
      public.has_role(_user_id, 'run_club_host')
      AND EXISTS (
        SELECT 1
        FROM public.run_club_events e
        WHERE e.id = _event_id
          AND e.org_id IS NOT NULL
          AND public.is_org_host(_user_id, e.org_id)
      )
    )
$$;

-- Drop old INSERT policy for run_club_events if it exists
DROP POLICY IF EXISTS "Hosts and admins can create events" ON public.run_club_events;

-- New INSERT policy for run_club_events: super_admin OR (run_club_host AND in org_hosts)
CREATE POLICY "Hosts can create events for their orgs"
ON public.run_club_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    public.has_role(auth.uid(), 'run_club_host')
    AND org_id IS NOT NULL
    AND public.is_org_host(auth.uid(), org_id)
  )
);

-- Drop old SELECT policy for event_registrations if it exists
DROP POLICY IF EXISTS "Hosts can view participants of their org events" ON public.event_registrations;

-- Update SELECT policy for event_registrations: users see their own OR hosts see their org's events
CREATE POLICY "Users and hosts can view accessible registrations"
ON public.event_registrations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.can_view_event_participants(auth.uid(), event_id)
);

-- Update orgs SELECT policy to use org_hosts
DROP POLICY IF EXISTS "Users can view accessible orgs" ON public.orgs;

CREATE POLICY "Users can view accessible orgs"
ON public.orgs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_org_host(auth.uid(), id)
);
