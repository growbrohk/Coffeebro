-- Migration: Enable multi-entry per day for CoffeeBro
-- This removes the unique constraint on (user_id, coffee_date) to allow multiple coffees per day

-- A) Drop legacy run table if exists
DO $$ BEGIN
  IF to_regclass('public.daily_runs') IS NOT NULL THEN
    DROP TABLE public.daily_runs CASCADE;
  END IF;
END $$;

-- B) Create daily_coffees if not exists (fresh schema)
CREATE TABLE IF NOT EXISTS public.daily_coffees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  rating INT NULL,
  coffee_type TEXT NULL,
  coffee_type_other TEXT NULL,
  place TEXT NULL,
  diary TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C) Remove unique constraint on (user_id, coffee_date) if it exists
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find and drop the unique constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.daily_coffees'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
    AND EXISTS (
      SELECT 1 FROM pg_attribute 
      WHERE attrelid = conrelid 
        AND attnum = ANY(conkey) 
        AND attname IN ('user_id', 'coffee_date')
    );
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_coffees DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Add index for speed (multi-column index for common queries)
CREATE INDEX IF NOT EXISTS idx_daily_coffees_user_date
ON public.daily_coffees(user_id, coffee_date);

-- D) Add rating range constraint (tolerant of null)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_coffees_rating_check'
  ) THEN
    ALTER TABLE public.daily_coffees
    ADD CONSTRAINT daily_coffees_rating_check 
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));
  END IF;
END $$;

-- E) Create/replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on daily_coffees BEFORE UPDATE to set updated_at
DROP TRIGGER IF EXISTS set_daily_coffees_updated_at ON public.daily_coffees;
CREATE TRIGGER set_daily_coffees_updated_at
BEFORE UPDATE ON public.daily_coffees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- F) Enable RLS + policies on daily_coffees
ALTER TABLE public.daily_coffees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS daily_coffees_select_own ON public.daily_coffees;
DROP POLICY IF EXISTS daily_coffees_insert_own ON public.daily_coffees;
DROP POLICY IF EXISTS daily_coffees_update_own ON public.daily_coffees;
DROP POLICY IF EXISTS daily_coffees_delete_own ON public.daily_coffees;

-- Create RLS policies
CREATE POLICY daily_coffees_select_own
ON public.daily_coffees
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY daily_coffees_insert_own
ON public.daily_coffees
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_coffees_update_own
ON public.daily_coffees
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_coffees_delete_own
ON public.daily_coffees
FOR DELETE
USING (auth.uid() = user_id);
