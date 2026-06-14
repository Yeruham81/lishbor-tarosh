-- Restrict sensitive columns on clues from authenticated role (server-only via service_role)
REVOKE SELECT (answer, alt_answer, hint, explanation) ON public.clues FROM authenticated;
REVOKE SELECT (answer, alt_answer, hint, explanation) ON public.clues FROM anon;

-- Restrict challenge tokens from authenticated; tokens are shared out-of-band and looked up server-side
REVOKE SELECT (token) ON public.challenges FROM authenticated;
REVOKE SELECT (token) ON public.challenges FROM anon;

-- Set stable search_path on remaining function that lacked it
ALTER FUNCTION public.normalize_external_id() SET search_path = 'public';