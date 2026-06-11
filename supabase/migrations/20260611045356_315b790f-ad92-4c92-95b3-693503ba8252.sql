REVOKE SELECT (email) ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (email) ON public.profiles TO service_role;

REVOKE SELECT (answer, alt_answer) ON public.clues FROM PUBLIC, anon, authenticated;
GRANT SELECT (answer, alt_answer) ON public.clues TO service_role;