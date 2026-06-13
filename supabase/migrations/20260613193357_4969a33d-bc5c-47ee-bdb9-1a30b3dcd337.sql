
-- =========================================================
-- 1. CLUE STATUS / SOFT DELETE
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.clue_status AS ENUM ('draft','active','inactive','archived','hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.clues
  ADD COLUMN IF NOT EXISTS status public.clue_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS times_displayed integer NOT NULL DEFAULT 0;

-- backfill: if is_active=false treat as inactive
UPDATE public.clues SET status = 'inactive' WHERE is_active = false AND status = 'active';

CREATE OR REPLACE FUNCTION public.clues_sync_is_active()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active' AND NEW.deleted_at IS NULL);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS clues_sync_is_active ON public.clues;
CREATE TRIGGER clues_sync_is_active
  BEFORE INSERT OR UPDATE ON public.clues
  FOR EACH ROW EXECUTE FUNCTION public.clues_sync_is_active();

-- Tighten game-visibility policy (active only, not soft-deleted)
DROP POLICY IF EXISTS clues_select_active ON public.clues;
CREATE POLICY clues_select_active ON public.clues
  FOR SELECT TO authenticated
  USING (status = 'active' AND deleted_at IS NULL);

-- =========================================================
-- 2. PUZZLE SUBMISSIONS — admin review fields
-- =========================================================
ALTER TABLE public.puzzle_submissions
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS edited_clue text,
  ADD COLUMN IF NOT EXISTS edited_answer text,
  ADD COLUMN IF NOT EXISTS edited_category text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_clue_id uuid REFERENCES public.clues(id) ON DELETE SET NULL;

-- status check
ALTER TABLE public.puzzle_submissions DROP CONSTRAINT IF EXISTS puzzle_submissions_status_check;
ALTER TABLE public.puzzle_submissions
  ADD CONSTRAINT puzzle_submissions_status_check
  CHECK (status IN ('pending','approved','rejected'));

-- =========================================================
-- 3. FEEDBACK — reply + status + read marker
-- =========================================================
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS reply_text text,
  ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_check;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('new','in_progress','resolved','closed'));

DROP TRIGGER IF EXISTS feedback_touch ON public.feedback;
CREATE TRIGGER feedback_touch BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 4. PROFILES — age + blocked flag
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer CHECK (age IS NULL OR (age BETWEEN 1 AND 120)),
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- =========================================================
-- 5. APP SETTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select_all ON public.app_settings;
CREATE POLICY app_settings_select_all ON public.app_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_settings_admin_write ON public.app_settings;
CREATE POLICY app_settings_admin_write ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS app_settings_touch ON public.app_settings;
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.app_settings (key, value) VALUES
  ('allow_player_submissions', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 6. HELPER FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_blocked(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE id = _uid), false)
$$;

CREATE OR REPLACE FUNCTION public.is_submissions_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT (value)::text::boolean FROM public.app_settings WHERE key = 'allow_player_submissions'),
    true
  )
$$;

-- =========================================================
-- 7. BLOCK + SUBMISSION-TOGGLE RLS ENFORCEMENT
-- =========================================================
-- Submissions: insert only if not blocked AND submissions are enabled
DROP POLICY IF EXISTS "users insert own submissions" ON public.puzzle_submissions;
CREATE POLICY "users insert own submissions" ON public.puzzle_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_blocked(auth.uid())
    AND public.is_submissions_enabled()
  );

-- Block writes for game_progress, clue_ratings, feedback when blocked
DROP POLICY IF EXISTS progress_block_blocked ON public.game_progress;
CREATE POLICY progress_block_blocked ON public.game_progress
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_blocked(auth.uid()))
  WITH CHECK (NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS ratings_block_blocked ON public.clue_ratings;
CREATE POLICY ratings_block_blocked ON public.clue_ratings
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_blocked(auth.uid()))
  WITH CHECK (NOT public.is_blocked(auth.uid()));

-- =========================================================
-- 8. ADMIN RPCs
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

  INSERT INTO public.clues (clue, answer, category, difficulty, status)
  VALUES (
    COALESCE(s.edited_clue, s.clue_text),
    COALESCE(s.edited_answer, s.suggested_answer),
    COALESCE(s.edited_category, s.category),
    GREATEST(1, LEAST(5, _difficulty)),
    'active'
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
       SET total_score = total_score + _points
     WHERE id = s.user_id;
  END IF;

  RETURN new_clue_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_submission(
  _submission_id uuid,
  _notes text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.puzzle_submissions
     SET status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         admin_notes = COALESCE(_notes, admin_notes)
   WHERE id = _submission_id AND status = 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_points(
  _user_id uuid,
  _delta integer,
  _reason text DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_total integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
     SET total_score = GREATEST(0, total_score + _delta)
   WHERE id = _user_id
   RETURNING total_score INTO new_total;
  RETURN new_total;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(
  _user_id uuid, _blocked boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET is_blocked = _blocked WHERE id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_clue(_clue_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.clues SET deleted_at = now(), status = 'archived' WHERE id = _clue_id;
END $$;

-- =========================================================
-- 9. ADMIN KPIs
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
                       WHERE last_play_date >= (current_date - _active_window_days)),
    'blocked_players', (SELECT count(*) FROM public.profiles WHERE is_blocked),
    'total_definitions', (SELECT count(*) FROM public.clues
                          WHERE status='active' AND deleted_at IS NULL),
    'draft_definitions', (SELECT count(*) FROM public.clues WHERE status='draft'),
    'archived_definitions', (SELECT count(*) FROM public.clues WHERE status='archived'),
    'pending_submissions', (SELECT count(*) FROM public.puzzle_submissions WHERE status='pending'),
    'approved_submissions', (SELECT count(*) FROM public.puzzle_submissions WHERE status='approved'),
    'rejected_submissions', (SELECT count(*) FROM public.puzzle_submissions WHERE status='rejected'),
    'total_solves', (SELECT count(*) FROM public.game_progress WHERE is_solved),
    'new_messages', (SELECT count(*) FROM public.feedback WHERE status='new'),
    'submissions_enabled', public.is_submissions_enabled()
  ) INTO result;
  RETURN result;
END $$;

-- =========================================================
-- 10. CONTENT HEALTH VIEW
-- =========================================================
CREATE OR REPLACE VIEW public.clue_health AS
SELECT
  c.id,
  c.clue,
  c.answer,
  c.status,
  c.deleted_at,
  c.times_displayed,
  c.solved_count,
  c.skip_count,
  c.likes_count,
  c.dislikes_count,
  CASE WHEN c.times_displayed > 0
       THEN c.solved_count::numeric / c.times_displayed
       ELSE NULL END AS success_rate,
  (c.times_displayed >= 20
   AND (c.solved_count::numeric / NULLIF(c.times_displayed,0)) < 0.30) AS low_success_rate,
  (c.dislikes_count > 5 AND c.dislikes_count > c.likes_count) AS high_dislikes,
  (c.hint IS NULL OR length(trim(c.hint)) = 0) AS missing_hint,
  (c.explanation IS NULL OR length(trim(c.explanation)) = 0) AS missing_explanation,
  (c.times_displayed = 0) AS never_shown,
  (c.times_displayed >= 30
   AND (c.solved_count::numeric / NULLIF(c.times_displayed,0)) < 0.10) AS very_high_failure
FROM public.clues c;

GRANT SELECT ON public.clue_health TO authenticated, service_role;

-- =========================================================
-- 11. ANALYTICS HELPERS (derived)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_daily_active_users(_days integer DEFAULT 30)
RETURNS TABLE(day date, users bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT last_play_date AS day, count(*)::bigint AS users
    FROM public.profiles
   WHERE last_play_date >= (current_date - _days)
   GROUP BY last_play_date
   ORDER BY last_play_date
$$;

REVOKE EXECUTE ON FUNCTION public.admin_daily_active_users(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_daily_active_users(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_submission_trends(_days integer DEFAULT 30)
RETURNS TABLE(day date, submitted bigint, approved bigint, rejected bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
         count(*)::bigint AS submitted,
         count(*) FILTER (WHERE status='approved')::bigint AS approved,
         count(*) FILTER (WHERE status='rejected')::bigint AS rejected
    FROM public.puzzle_submissions
   WHERE created_at >= now() - make_interval(days => _days)
   GROUP BY day ORDER BY day
$$;

CREATE OR REPLACE FUNCTION public.admin_category_performance()
RETURNS TABLE(category text, total bigint, avg_success numeric, total_solves bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(category,'(uncategorized)') AS category,
         count(*)::bigint AS total,
         AVG(CASE WHEN times_displayed>0
                  THEN solved_count::numeric/times_displayed END) AS avg_success,
         SUM(solved_count)::bigint AS total_solves
    FROM public.clues
   WHERE status='active' AND deleted_at IS NULL
   GROUP BY 1 ORDER BY total DESC
$$;
