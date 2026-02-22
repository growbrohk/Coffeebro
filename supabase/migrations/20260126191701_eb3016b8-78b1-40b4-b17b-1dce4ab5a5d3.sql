-- Add optional run details columns to daily_runs
ALTER TABLE public.daily_runs
ADD COLUMN duration_minutes INTEGER NULL,
ADD COLUMN run_type TEXT NULL,
ADD COLUMN tiredness_score SMALLINT NULL;

-- Add check constraints for validation
ALTER TABLE public.daily_runs
ADD CONSTRAINT duration_minutes_positive CHECK (duration_minutes IS NULL OR duration_minutes >= 1),
ADD CONSTRAINT run_type_valid CHECK (run_type IS NULL OR run_type IN ('easy', 'tempo', 'long_slow_distance', 'interval')),
ADD CONSTRAINT tiredness_score_valid CHECK (tiredness_score IS NULL OR (tiredness_score >= 1 AND tiredness_score <= 10));