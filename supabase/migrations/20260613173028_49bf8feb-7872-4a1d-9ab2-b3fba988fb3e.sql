
-- 1) Profiles: revoke sensitive columns from authenticated role (column-level)
REVOKE SELECT (
  accessibility_prefs,
  notification_prefs,
  auto_next,
  hints_used_total,
  wrong_letters_total,
  definitions_skipped,
  definitions_played,
  last_play_date
) ON public.profiles FROM authenticated;

-- 2) hint_usage: remove client INSERT capability; only service_role (server) writes
DROP POLICY IF EXISTS "hints_own_insert" ON public.hint_usage;
REVOKE INSERT ON public.hint_usage FROM authenticated;
