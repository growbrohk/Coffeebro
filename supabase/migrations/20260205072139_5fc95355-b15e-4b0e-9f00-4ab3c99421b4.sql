-- Create orgs table
CREATE TABLE public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  org_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on orgs
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Add org_id to run_club_events
ALTER TABLE public.run_club_events 
ADD COLUMN org_id uuid REFERENCES public.orgs(id);

-- Security definer function: check if user owns an org
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orgs
    WHERE id = _org_id
      AND owner_user_id = _user_id
  )
$$;

-- Security definer function: check if user can view org (super_admin or owner)
CREATE OR REPLACE FUNCTION public.can_view_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'super_admin') 
    OR EXISTS (
      SELECT 1
      FROM public.orgs
      WHERE id = _org_id
        AND owner_user_id = _user_id
    )
$$;

-- Security definer function: check if user can view event's participants
CREATE OR REPLACE FUNCTION public.can_view_event_participants(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.run_club_events e
      JOIN public.orgs o ON e.org_id = o.id
      WHERE e.id = _event_id
        AND o.owner_user_id = _user_id
        AND public.has_role(_user_id, 'run_club_host')
    )
$$;

-- RLS Policies for orgs table

-- Only super_admin can insert orgs
CREATE POLICY "Super admins can create orgs"
ON public.orgs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can see all orgs, owners can see their own
CREATE POLICY "Users can view accessible orgs"
ON public.orgs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR owner_user_id = auth.uid()
);

-- Update event_registrations RLS to allow hosts to see their org's event participants
CREATE POLICY "Hosts can view participants of their org events"
ON public.event_registrations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.can_view_event_participants(auth.uid(), event_id)
);