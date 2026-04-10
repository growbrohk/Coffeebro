-- Per-org staff RLS: do not require global user_access.role = 'owner' when
-- can_manage_org_offers / org visibility already encode the permission matrix.
-- Also allow org SELECT for legacy primary owners (owner_user_id only).
-- Backfill org_hosts for owner_user_id where missing and resync user_access.

-- 1) Calendar offers: super_admin OR per-org offer managers (owner/host/manager)
DROP POLICY IF EXISTS "offers_insert_calendar" ON public.offers;
DROP POLICY IF EXISTS "offers_update_calendar" ON public.offers;
DROP POLICY IF EXISTS "offers_delete_calendar" ON public.offers;

CREATE POLICY "offers_insert_calendar"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (
    source_type = 'calendar'
    AND event_date IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

CREATE POLICY "offers_update_calendar"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    source_type = 'calendar'
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

CREATE POLICY "offers_delete_calendar"
  ON public.offers FOR DELETE
  TO authenticated
  USING (
    source_type = 'calendar'
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

-- 2) Preset offers: same
DROP POLICY IF EXISTS "preset_offers_insert_org_staff" ON public.preset_offers;
DROP POLICY IF EXISTS "preset_offers_update_org_staff" ON public.preset_offers;
DROP POLICY IF EXISTS "preset_offers_delete_org_staff" ON public.preset_offers;

CREATE POLICY "preset_offers_insert_org_staff"
  ON public.preset_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

CREATE POLICY "preset_offers_update_org_staff"
  ON public.preset_offers FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.can_manage_org_offers(auth.uid(), org_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.can_manage_org_offers(auth.uid(), org_id)
  );

CREATE POLICY "preset_offers_delete_org_staff"
  ON public.preset_offers FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.can_manage_org_offers(auth.uid(), org_id)
  );

-- 3) Hunts insert: org-scoped offer managers (not global user_access only)
DROP POLICY IF EXISTS "hunts_insert_host" ON public.hunts;

CREATE POLICY "hunts_insert_host"
  ON public.hunts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

-- 4) Orgs SELECT: primary owner can read their org without org_hosts row
DROP POLICY IF EXISTS "Users can view accessible orgs" ON public.orgs;

CREATE POLICY "Users can view accessible orgs"
ON public.orgs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_org_host(auth.uid(), id)
  OR owner_user_id = auth.uid()
);

-- 5) Backfill org_hosts primary owner rows; resync global user_access
INSERT INTO public.org_hosts (org_id, user_id, role)
SELECT o.id, o.owner_user_id, 'owner'::text
FROM public.orgs o
WHERE o.owner_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.org_hosts oh
    WHERE oh.org_id = o.id
      AND oh.user_id = o.owner_user_id
  )
ON CONFLICT (org_id, user_id) DO NOTHING;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT owner_user_id AS uid FROM public.orgs WHERE owner_user_id IS NOT NULL
  LOOP
    PERFORM public.sync_user_access_for_user(r.uid);
  END LOOP;
END $$;
