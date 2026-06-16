
-- Add explanation and difficulty fields to submissions so admin can edit them
ALTER TABLE public.puzzle_submissions
  ADD COLUMN IF NOT EXISTS edited_explanation text,
  ADD COLUMN IF NOT EXISTS edited_difficulty integer;

ALTER TABLE public.puzzle_submissions
  DROP CONSTRAINT IF EXISTS puzzle_submissions_edited_difficulty_check;
ALTER TABLE public.puzzle_submissions
  ADD CONSTRAINT puzzle_submissions_edited_difficulty_check
  CHECK (edited_difficulty IS NULL OR (edited_difficulty BETWEEN 1 AND 5));

-- Update approve RPC to honour edited_difficulty / edited_explanation when present
CREATE OR REPLACE FUNCTION public.admin_approve_submission(_submission_id uuid, _points integer DEFAULT 50, _difficulty integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.puzzle_submissions%ROWTYPE;
  new_clue_id uuid;
  v_diff integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO s FROM public.puzzle_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF s.status = 'approved' THEN RAISE EXCEPTION 'submission already approved'; END IF;

  v_diff := GREATEST(1, LEAST(5, COALESCE(s.edited_difficulty, _difficulty)));

  INSERT INTO public.clues (clue, answer, category, difficulty, explanation, status, approved_from_submission_id)
  VALUES (
    COALESCE(s.edited_clue, s.clue_text),
    COALESCE(s.edited_answer, s.suggested_answer),
    COALESCE(s.edited_category, s.category),
    v_diff,
    s.edited_explanation,
    'active',
    s.id
  )
  RETURNING id INTO new_clue_id;

  UPDATE public.puzzle_submissions
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         points_awarded = _points,
         approved_clue_id = new_clue_id
   WHERE id = _submission_id;

  IF _points > 0 THEN
    UPDATE public.profiles
       SET total_score = total_score + _points,
           last_seen_at = now()
     WHERE id = s.user_id;
  END IF;

  RETURN new_clue_id;
END $function$;

-- Seed default values for all settings keys (only inserts when missing)
INSERT INTO public.app_settings (key, value) VALUES
  ('base_points_per_definition', '10'::jsonb),
  ('points_penalty_per_mistake', '1'::jsonb),
  ('points_penalty_per_hint', '2'::jsonb),
  ('allow_skip', 'true'::jsonb),
  ('allow_hints', 'true'::jsonb),
  ('allow_player_submissions', 'true'::jsonb),
  ('allow_new_registrations', 'true'::jsonb),
  ('leaderboard_visible', 'true'::jsonb),
  ('max_wrong_attempts', '5'::jsonb),
  ('daily_streak_bonus', '5'::jsonb),
  ('max_streak_multiplier', '3'::jsonb),
  ('required_streak_days', '7'::jsonb),
  ('featured_clue_min_likes', '10'::jsonb),
  ('auto_hide_after_dislikes', '20'::jsonb),
  ('problematic_success_rate_threshold', '0.2'::jsonb),
  ('submission_cooldown_minutes', '60'::jsonb),
  ('max_submissions_per_day', '5'::jsonb),
  ('auto_hide_low_rated_clues', 'false'::jsonb),
  ('global_announcement_banner', '""'::jsonb),
  ('popup_announcement_text', '""'::jsonb),
  ('minimum_supported_app_version', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
