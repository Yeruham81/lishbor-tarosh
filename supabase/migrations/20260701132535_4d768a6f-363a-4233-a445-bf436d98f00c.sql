
ALTER TABLE public.clues ADD COLUMN IF NOT EXISTS credit text;

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
  v_credit text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO s FROM public.puzzle_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF s.status = 'approved' THEN RAISE EXCEPTION 'submission already approved'; END IF;

  v_diff := GREATEST(1, LEAST(5, COALESCE(s.edited_difficulty, _difficulty)));

  SELECT COALESCE(display_name, username) INTO v_credit
    FROM public.profiles WHERE id = s.user_id;

  INSERT INTO public.clues (clue, answer, category, difficulty, explanation, status, approved_from_submission_id, credit)
  VALUES (
    COALESCE(s.edited_clue, s.clue_text),
    COALESCE(s.edited_answer, s.suggested_answer),
    COALESCE(s.edited_category, s.category),
    v_diff,
    s.edited_explanation,
    'active',
    s.id,
    v_credit
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
