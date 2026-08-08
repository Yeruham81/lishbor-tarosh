REVOKE EXECUTE ON FUNCTION public.is_registration_enabled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_registration_enabled() TO service_role;