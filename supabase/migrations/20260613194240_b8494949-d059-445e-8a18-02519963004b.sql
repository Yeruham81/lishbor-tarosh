
-- =========================================================
-- 1. PROFILES: highest_streak + last_seen_at
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS highest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Backfill highest_streak from existing best_streak / current_streak
UPDATE public.profiles
   SET highest_streak = GREATEST(highest_streak, COALESCE(best_streak,0), COALESCE(current_streak,0));

-- Keep highest_streak and best_streak in sync (both legacy + new field stay correct).
CREATE OR REPLACE FUNCTION public.profiles_sync_streaks()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE peak integer;
BEGIN
  peak := GREATEST(
    COALESCE(NEW.highest_streak, 0),
    COALESCE(NEW.best_streak, 0),
    COALESCE(NEW.current_streak, 0)
  );
  NEW.highest_streak := peak;
  NEW.best_streak := peak;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_sync_streaks ON public.profiles;
CREATE TRIGGER profiles_sync_streaks
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_streaks();

-- =========================================================
-- 2. CLUES: publish_at, expire_at, internal_notes, approved_from_submission_id
-- =========================================================
ALTER TABLE public.clues
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS expire_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS approved_from_submission_id uuid
    REFERENCES public.puzzle_submissions(id) ON DELETE SET NULL;

-- Extend game-visibility RLS policy (does not affect the is_active trigger).
DROP POLICY IF EXISTS clues_select_active ON public.clues;
CREATE POLICY clues_select_active ON public.clues
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND deleted_at IS NULL
    AND (publish_at IS NULL OR publish_at <= now())
    AND (expire_at  IS NULL OR expire_at  > now())
  );

-- =========================================================
-- 3. UPDATE APPROVAL RPC TO RECORD REVERSE LINK
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_approve_submission(
  _submission_id uuid,
  _points integer DEFAULT 50,
  _difficulty integer DEFAULT 1
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.puzzle_submissions%ROWTYPE;
  new_clue_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO s FROM public.puzzle_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'submission already %', s.status; END IF;

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
END $$;

REVOKE ALL ON FUNCTION public.admin_approve_submission(uuid,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_submission(uuid,integer,integer) TO authenticated, service_role;

-- =========================================================
-- 4. ANALYTICS: prefer last_seen_at where applicable
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_kpis(_active_window_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total_players', (SELECT count(*) FROM public.profiles),
    'active_players', (SELECT count(*) FROM public.profiles
                       WHERE COALESCE(last_seen_at,
                                      (last_play_date::timestamptz))
                             >= now() - make_interval(days => _active_window_days)),
    'blocked_players', (SELECT count(*) FROM public.profiles WHERE is_blocked),
    'total_definitions', (SELECT count(*) FROM public.clues
                          WHERE status='active' AND deleted_at IS NULL
                            AND (publish_at IS NULL OR publish_at <= now())
                            AND (expire_at  IS NULL OR expire_at  > now())),
    'draft_definitions', (SELECT count(*) FROM public.clues WHERE status='draft'),
    'archived_definitions', (SELECT count(*) FROM public.clues WHERE status='archived'),
    'scheduled_definitions', (SELECT count(*) FROM public.clues
                              WHERE status='active' AND deleted_at IS NULL
                                AND publish_at IS NOT NULL AND publish_at > now()),
    'expired_definitions', (SELECT count(*) FROM public.clues
                            WHERE status='active' AND deleted_at IS NULL
                              AND expire_at IS NOT NULL AND expire_at <= now()),
    'pending_submissions', (SELECT count(*) FROM public.puzzle_submissions WHERE status='pending'),
    'approved_submissions', (SELECT count(*) FROM public.puzzle_submissions WHERE status='approved'),
    'rejected_submissions', (SELECT count(*) FROM public.puzzle_submissions WHERE status='rejected'),
    'total_solves', (SELECT count(*) FROM public.game_progress WHERE is_solved),
    'new_messages', (SELECT count(*) FROM public.feedback WHERE status='new'),
    'submissions_enabled', public.is_submissions_enabled()
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_kpis(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_kpis(integer) TO authenticated, service_role;

-- =========================================================
-- 5. LIGHTWEIGHT touch_last_seen helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated, service_role;
