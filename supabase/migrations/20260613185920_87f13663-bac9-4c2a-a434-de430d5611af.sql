REVOKE SELECT (email) ON public.profiles FROM authenticated;
REVOKE SELECT (token) ON public.challenges FROM authenticated;
REVOKE SELECT (answer, alt_answer, hint, explanation) ON public.clues FROM authenticated;