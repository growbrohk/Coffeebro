-- One-time repair: legacy OpeningHoursEditor bound "checked" to closed=true, so users who
-- checked a day as "open" stored the opposite. Invert each weekday's `closed` flag to match intent.
-- Deploy together with the fixed OpeningHoursEditor (same release).

DO $$
DECLARE
  r record;
  new_hours jsonb;
  k text;
  days text[] := ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
BEGIN
  FOR r IN
    SELECT id, opening_hours
    FROM public.orgs
    WHERE opening_hours IS NOT NULL
  LOOP
    new_hours := r.opening_hours;
    FOREACH k IN ARRAY days
    LOOP
      IF new_hours ? k AND jsonb_typeof(new_hours -> k) = 'object' THEN
        new_hours :=
          new_hours
          || jsonb_build_object(
            k,
            (new_hours -> k)
            || jsonb_build_object(
              'closed',
              NOT COALESCE((new_hours -> k ->> 'closed')::boolean, false)
            )
          );
      END IF;
    END LOOP;
    UPDATE public.orgs SET opening_hours = new_hours WHERE id = r.id;
  END LOOP;
END $$;
