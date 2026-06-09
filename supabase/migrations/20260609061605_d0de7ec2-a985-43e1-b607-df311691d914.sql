
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perfect_solves integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS definitions_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS definitions_skipped integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hints_used_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrong_letters_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_play_days_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_play_days_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_play_date date;

ALTER TABLE public.game_progress
  ADD COLUMN IF NOT EXISTS is_perfect boolean NOT NULL DEFAULT false;

-- Reset all progression data to a clean baseline for the new system
UPDATE public.profiles SET
  total_score = 0,
  level = 1,
  current_streak = 0,
  best_streak = 0,
  solved_count = 0,
  perfect_solves = 0,
  definitions_played = 0,
  definitions_skipped = 0,
  hints_used_total = 0,
  wrong_letters_total = 0,
  current_play_days_streak = 0,
  best_play_days_streak = 0,
  last_play_date = NULL;

DELETE FROM public.game_progress;
DELETE FROM public.hint_usage;
