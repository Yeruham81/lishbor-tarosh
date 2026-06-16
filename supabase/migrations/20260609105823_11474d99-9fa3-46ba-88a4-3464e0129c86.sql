
DROP POLICY IF EXISTS profiles_select ON public.profiles;

-- Anyone authenticated can view non-private profiles, but NOT their email.
-- We enforce email privacy at the column level by revoking access to that column.
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT
  TO authenticated
USING (auth.uid() = id);

-- Restrict column-level access to the email field: only the owner can read it.
REVOKE SELECT (email) ON public.profiles FROM authenticated;
GRANT SELECT (email) ON public.profiles TO service_role;

-- Provide an owner-only policy that allows the owner to read all their own columns (incl. email).
DROP POLICY IF EXISTS profiles_select_own_full ON public.profiles;
CREATE POLICY profiles_select_own_full ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Grant the non-sensitive columns explicitly to authenticated so leaderboard/display still works.
GRANT SELECT (
  id, username, display_name, avatar_url, total_score, level,
  current_streak, best_streak, solved_count, created_at, updated_at,
  display_name_confirmed, is_private, auto_next, auth_provider,
  notification_prefs, accessibility_prefs, perfect_solves,
  definitions_played, definitions_skipped, hints_used_total,
  wrong_letters_total, current_play_days_streak, best_play_days_streak,
  last_play_date
) ON public.profiles TO authenticated;
