
-- Extend clue_health with high_skips flag
CREATE OR REPLACE VIEW public.clue_health AS
SELECT id,
  clue,
  answer,
  status,
  deleted_at,
  times_displayed,
  solved_count,
  skip_count,
  likes_count,
  dislikes_count,
  CASE WHEN times_displayed > 0 THEN solved_count::numeric / times_displayed::numeric ELSE NULL::numeric END AS success_rate,
  times_displayed >= 20 AND (solved_count::numeric / NULLIF(times_displayed, 0)::numeric) < 0.30 AS low_success_rate,
  dislikes_count > 5 AND dislikes_count > likes_count AS high_dislikes,
  hint IS NULL OR length(TRIM(BOTH FROM hint)) = 0 AS missing_hint,
  explanation IS NULL OR length(TRIM(BOTH FROM explanation)) = 0 AS missing_explanation,
  times_displayed = 0 AS never_shown,
  times_displayed >= 30 AND (solved_count::numeric / NULLIF(times_displayed, 0)::numeric) < 0.10 AS very_high_failure,
  times_displayed >= 10 AND skip_count::numeric / NULLIF(times_displayed, 0)::numeric > 0.30 AS high_skips
FROM public.clues c;

-- Allow approval/edit of submissions in pending OR rejected state
CREATE OR REPLACE FUNCTION public.admin_approve_submission(_submission_id uuid, _points integer DEFAULT 50, _difficulty integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.puzzle_submissions%ROWTYPE;
  new_clue_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO s FROM public.puzzle_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF s.status = 'approved' THEN RAISE EXCEPTION 'submission already approved'; END IF;

  INSERT INTO public.clues (clue, answer, category, difficulty, status, approved_from_submission_id)
  VALUES (
    COALESCE(s.edited_clue, s.clue_text),
    COALESCE(s.edited_answer, s.suggested_answer),
    COALESCE(s.edited_category, s.category),
    GREATEST(1, LEAST(5, _difficulty)),
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

-- Allow rejecting from any non-approved state too (pending or already rejected — idempotent edit)
CREATE OR REPLACE FUNCTION public.admin_reject_submission(_submission_id uuid, _notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.puzzle_submissions
     SET status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         admin_notes = COALESCE(_notes, admin_notes)
   WHERE id = _submission_id AND status <> 'approved';
END $function$;
