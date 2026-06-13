
-- 1) game_progress: drop client INSERT/UPDATE/DELETE policies; keep SELECT for own rows.
DROP POLICY IF EXISTS progress_own_insert ON public.game_progress;
DROP POLICY IF EXISTS progress_own_update ON public.game_progress;
DROP POLICY IF EXISTS progress_own_delete ON public.game_progress;
REVOKE INSERT, UPDATE, DELETE ON public.game_progress FROM authenticated;

-- 2) clues: hide answer/alt_answer/hint/explanation from authenticated.
REVOKE SELECT (answer, alt_answer, hint, explanation) ON public.clues FROM authenticated;

-- 3) profiles: hide auth_provider from authenticated.
REVOKE SELECT (auth_provider) ON public.profiles FROM authenticated;

-- 4) challenges: hide token column from authenticated.
REVOKE SELECT (token) ON public.challenges FROM authenticated;
