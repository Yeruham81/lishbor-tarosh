-- Make profile reset and account deletion transactional.
-- These functions are callable only with the server-side service role.

CREATE OR REPLACE FUNCTION public.reset_player_progress(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  DELETE FROM public.game_progress WHERE user_id = _user_id;
  DELETE FROM public.hint_usage WHERE user_id = _user_id;
  DELETE FROM public.clue_ratings WHERE user_id = _user_id;
  DELETE FROM public.challenges WHERE challenger_id = _user_id;

  UPDATE public.profiles
  SET
    total_score = 0,
    solved_count = 0,
    current_streak = 0,
    best_streak = 0,
    highest_streak = 0,
    level = 1,
    perfect_solves = 0,
    definitions_played = 0,
    definitions_skipped = 0,
    hints_used_total = 0,
    wrong_letters_total = 0,
    current_play_days_streak = 0,
    best_play_days_streak = 0,
    last_play_date = NULL,
    active_day_date = NULL,
    active_day_solves = 0
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_player_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_player_progress(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_player_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  -- These legacy tables do not have foreign keys to auth.users.
  DELETE FROM public.clue_ratings WHERE user_id = _user_id;
  DELETE FROM public.challenges WHERE challenger_id = _user_id;
  DELETE FROM public.feedback WHERE user_id = _user_id;
  DELETE FROM public.puzzle_submissions WHERE user_id = _user_id;

  -- Cascades remove the profile, role, progress, hints and purchases.
  DELETE FROM auth.users WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_player_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_player_account(uuid) TO service_role;
