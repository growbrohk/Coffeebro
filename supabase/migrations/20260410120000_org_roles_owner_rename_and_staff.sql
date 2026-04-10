-- 1) Global role: run_club_host -> owner (same meaning: org staff / café staff)
ALTER TYPE public.app_role RENAME VALUE 'run_club_host' TO 'owner';

-- 2) org_hosts: add manager, barista
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'org_hosts'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%role%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.org_hosts DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.org_hosts
  ADD CONSTRAINT org_hosts_role_check
  CHECK (role IN ('owner', 'host', 'manager', 'barista'));

-- 3) Helper functions (per-org permissions)
CREATE OR REPLACE FUNCTION public.org_staff_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oh.role
  FROM public.org_hosts oh
  WHERE oh.org_id = _org_id
    AND oh.user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_offers(_user_id uuid, _org_id uuid)
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
      AND oh.role IN ('owner', 'host', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_org_profile(_user_id uuid, _org_id uuid)
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

CREATE OR REPLACE FUNCTION public.can_scan_vouchers_for_org(_user_id uuid, _org_id uuid)
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
      AND oh.role IN ('owner', 'host', 'manager', 'barista')
  );
$$;

-- 4) Update functions that referenced run_club_host
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
      AND role IN ('super_admin', 'owner')
  );
$$;

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
      public.has_role(_user_id, 'owner')
      AND public.is_org_host(_user_id, _org_id)
    );
$$;

-- 5) Sync user_access when org_hosts changes (never downgrade super_admin)
CREATE OR REPLACE FUNCTION public.sync_user_access_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_access ua
    WHERE ua.user_id = _user_id AND ua.role = 'super_admin'::public.app_role
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.org_hosts oh WHERE oh.user_id = _user_id) THEN
    INSERT INTO public.user_access (user_id, role)
    VALUES (_user_id, 'owner'::public.app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner'::public.app_role;
  ELSE
    UPDATE public.user_access
    SET role = 'user'::public.app_role
    WHERE user_id = _user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_access_from_org_hosts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_user_access_for_user(OLD.user_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.sync_user_access_for_user(OLD.user_id);
    PERFORM public.sync_user_access_for_user(NEW.user_id);
    RETURN NEW;
  ELSE
    PERFORM public.sync_user_access_for_user(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_hosts_sync_user_access ON public.org_hosts;
CREATE TRIGGER trg_org_hosts_sync_user_access
AFTER INSERT OR UPDATE OR DELETE ON public.org_hosts
FOR EACH ROW EXECUTE PROCEDURE public.sync_user_access_from_org_hosts();

-- Backfill user_access for existing org_hosts users
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.org_hosts
  LOOP
    PERFORM public.sync_user_access_for_user(r.user_id);
  END LOOP;
END $$;

-- 6) orgs: allow primary org staff (owner/host) to update profile
CREATE POLICY "Org profile editors can update orgs"
ON public.orgs
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.can_edit_org_profile(auth.uid(), id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.can_edit_org_profile(auth.uid(), id)
);

-- 7) offers: org-scoped calendar policies
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
      OR (
        public.has_role(auth.uid(), 'owner')
        AND public.can_manage_org_offers(auth.uid(), org_id)
      )
    )
  );

CREATE POLICY "offers_update_calendar"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    source_type = 'calendar'
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR (
        public.has_role(auth.uid(), 'owner')
        AND public.can_manage_org_offers(auth.uid(), org_id)
      )
    )
  );

CREATE POLICY "offers_delete_calendar"
  ON public.offers FOR DELETE
  TO authenticated
  USING (
    source_type = 'calendar'
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR (
        public.has_role(auth.uid(), 'owner')
        AND public.can_manage_org_offers(auth.uid(), org_id)
      )
    )
  );

-- 8) preset_offers: org membership instead of creator-only
DROP POLICY IF EXISTS "preset_offers_insert_creator" ON public.preset_offers;
DROP POLICY IF EXISTS "preset_offers_update_creator" ON public.preset_offers;
DROP POLICY IF EXISTS "preset_offers_delete_creator" ON public.preset_offers;

CREATE POLICY "preset_offers_insert_org_staff"
  ON public.preset_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR (
        public.has_role(auth.uid(), 'owner')
        AND public.can_manage_org_offers(auth.uid(), org_id)
      )
    )
  );

CREATE POLICY "preset_offers_update_org_staff"
  ON public.preset_offers FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'owner')
      AND public.can_manage_org_offers(auth.uid(), org_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'owner')
      AND public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

CREATE POLICY "preset_offers_delete_org_staff"
  ON public.preset_offers FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'owner')
      AND public.can_manage_org_offers(auth.uid(), org_id)
    )
  );

-- 9) RPCs
CREATE OR REPLACE FUNCTION public.redeem_voucher_atomic(p_code text)
RETURNS TABLE(status text, message text, voucher_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher public.vouchers%rowtype;
  v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT 'NOT_AUTHORIZED'::text, 'Not signed in'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT *
  INTO v_voucher
  FROM public.vouchers
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'NOT_FOUND'::text, 'Invalid code'::text, NULL::uuid;
    RETURN;
  END IF;

  v_ok := public.has_role(auth.uid(), 'super_admin')
    OR public.can_scan_vouchers_for_org(auth.uid(), v_voucher.org_id);

  IF NOT v_ok THEN
    RETURN QUERY SELECT 'NOT_AUTHORIZED'::text, 'Staff only'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_voucher.expires_at IS NOT NULL AND now() > v_voucher.expires_at THEN
    RETURN QUERY SELECT 'EXPIRED'::text, 'Voucher expired'::text, v_voucher.id;
    RETURN;
  END IF;

  IF v_voucher.status <> 'active' THEN
    RETURN QUERY SELECT 'ALREADY_REDEEMED'::text, 'Already redeemed'::text, v_voucher.id;
    RETURN;
  END IF;

  UPDATE public.vouchers
  SET status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid()
  WHERE id = v_voucher.id;

  RETURN QUERY SELECT 'OK'::text, 'Redeemed'::text, v_voucher.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_offer_participants(p_offer_id uuid)
RETURNS TABLE(
  voucher_id uuid,
  owner_id uuid,
  owner_name text,
  owner_handle text,
  selected_coffee_type text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING errcode = 'P0001', message = 'NOT_AUTHORIZED';
  END IF;

  SELECT o.org_id INTO v_org_id
  FROM public.offers o
  WHERE o.id = p_offer_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION USING errcode = 'P0001', message = 'OFFER_NOT_FOUND';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin')
    OR public.can_manage_org_offers(auth.uid(), v_org_id)
  ) THEN
    RAISE EXCEPTION USING errcode = 'P0001', message = 'NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    v.id AS voucher_id,
    v.owner_id,
    coalesce(p.username, '') AS owner_name,
    ''::text AS owner_handle,
    v.selected_coffee_type,
    v.status,
    v.created_at,
    v.redeemed_at
  FROM public.vouchers v
  LEFT JOIN public.profiles p ON p.user_id = v.owner_id
  WHERE v.offer_id = p_offer_id
  ORDER BY v.created_at ASC;
END;
$$;

-- 10) Store conversion RPC: staff role renamed
CREATE OR REPLACE FUNCTION public.get_store_conversion_rates(p_org_ids text[])
RETURNS TABLE(
  store_id text,
  starts bigint,
  signups bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_authorized_ids text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT o.id::text)
  INTO v_authorized_ids
  FROM public.orgs o
  LEFT JOIN public.org_hosts oh ON oh.org_id = o.id AND oh.user_id = v_user_id
  LEFT JOIN public.user_access ua ON ua.user_id = v_user_id AND ua.role IN ('super_admin'::public.app_role, 'owner'::public.app_role)
  WHERE o.id::text = ANY(p_org_ids)
    AND (o.owner_user_id = v_user_id OR oh.id IS NOT NULL OR ua.role = 'super_admin'::public.app_role);

  IF v_authorized_ids IS NULL OR array_length(v_authorized_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    qs.store_id,
    count(*)::bigint AS starts,
    count(qs.user_id)::bigint AS signups,
    CASE
      WHEN count(*) = 0 THEN 0::numeric
      ELSE round(100.0 * count(qs.user_id) / count(*), 1)
    END AS conversion_rate
  FROM public.quiz_sessions qs
  WHERE qs.store_id = ANY(v_authorized_ids)
  GROUP BY qs.store_id;
END;
$$;

-- 11) Hunts: insert policy uses global owner role
DROP POLICY IF EXISTS "hunts_insert_host" ON public.hunts;
CREATE POLICY "hunts_insert_host"
  ON public.hunts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_access ua
      WHERE ua.user_id = auth.uid()
        AND ua.role IN ('super_admin'::public.app_role, 'owner'::public.app_role)
    )
  );
