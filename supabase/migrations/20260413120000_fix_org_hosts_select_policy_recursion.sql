-- PostgREST 500 / SQLSTATE 42P17: infinite recursion detected in policy for relation "org_hosts".
-- The SELECT policy used EXISTS (SELECT ... FROM org_hosts ...), which re-evaluated RLS on org_hosts.
-- Use existing SECURITY DEFINER helper is_org_host (reads org_hosts as definer, no recursion).

DROP POLICY IF EXISTS "Users can view accessible org_hosts" ON public.org_hosts;

CREATE POLICY "Users can view accessible org_hosts"
ON public.org_hosts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR user_id = auth.uid()
  OR public.is_org_host(auth.uid(), org_id)
);
