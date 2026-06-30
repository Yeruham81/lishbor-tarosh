
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_day_date date,
  ADD COLUMN IF NOT EXISTS active_day_solves integer NOT NULL DEFAULT 0;

-- Seed: treat existing players' last_play_date as already "qualified" so they
-- don't get double-credit today and their streak doesn't reset on the first
-- post-migration solve.
UPDATE public.profiles
   SET active_day_date = last_play_date,
       active_day_solves = 5
 WHERE last_play_date IS NOT NULL
   AND active_day_date IS NULL;
