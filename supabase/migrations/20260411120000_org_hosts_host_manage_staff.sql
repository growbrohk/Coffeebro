-- Hosts with org_hosts role owner or host can list/add/remove/update staff (non-primary-owner rows).
-- SELECT extended so any org member can read all org_hosts rows for their org (team list).

CREATE OR REPLACE FUNCTION public.can_manage_org_staff(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_hosts oh
    WHERE oh.org_id = _org_id
      AND oh.user_id = _user_id
      AND oh.role IN ('owner', 'host')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_org_staff(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view accessible org_hosts" ON public.org_hosts;
DROP POLICY IF EXISTS "Super admins can manage org_hosts" ON public.org_hosts;

CREATE POLICY "Users can view accessible org_hosts"
ON public.org_hosts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.org_hosts oh
    WHERE oh.org_id = org_hosts.org_id
      AND oh.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins insert org_hosts"
ON public.org_hosts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update org_hosts"
ON public.org_hosts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins delete org_hosts"
ON public.org_hosts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org hosts insert staff"
ON public.org_hosts
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_org_staff(auth.uid(), org_id)
  AND role IN ('host', 'manager', 'barista')
);

CREATE POLICY "Org hosts update staff"
ON public.org_hosts
FOR UPDATE
TO authenticated
USING (
  public.can_manage_org_staff(auth.uid(), org_id)
  AND NOT (
    role = 'owner'
    AND EXISTS (
      SELECT 1
      FROM public.orgs o
      WHERE o.id = org_id
        AND o.owner_user_id IS NOT NULL
        AND o.owner_user_id = user_id
    )
  )
)
WITH CHECK (
  public.can_manage_org_staff(auth.uid(), org_id)
  AND (
    role IN ('host', 'manager', 'barista')
    OR (
      role = 'owner'
      AND user_id = (SELECT o.owner_user_id FROM public.orgs o WHERE o.id = org_id)
    )
  )
);

CREATE POLICY "Org hosts delete staff"
ON public.org_hosts
FOR DELETE
TO authenticated
USING (
  public.can_manage_org_staff(auth.uid(), org_id)
  AND NOT (
    EXISTS (
      SELECT 1
      FROM public.orgs o
      WHERE o.id = org_id
        AND o.owner_user_id IS NOT NULL
        AND o.owner_user_id = user_id
    )
    AND role = 'owner'
  )
);
