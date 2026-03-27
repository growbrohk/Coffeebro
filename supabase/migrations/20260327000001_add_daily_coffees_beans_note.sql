-- Optional beans and short note on each coffee log (distinct from diary)
ALTER TABLE public.daily_coffees
  ADD COLUMN IF NOT EXISTS beans TEXT NULL,
  ADD COLUMN IF NOT EXISTS note TEXT NULL;
