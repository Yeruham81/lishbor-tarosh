-- Harden profile writes: authenticated clients may read allowed profile fields,
-- but may not update profile rows directly. All legitimate player-controlled
-- changes go through authenticated server functions that validate their input
-- and write with the service role.

REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Defense in depth: even if UPDATE is accidentally granted again later,
-- there is no authenticated RLS policy that permits arbitrary profile writes.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- Existing SECURITY DEFINER helpers (for example touch_last_seen) and
-- service-role game/profile/payment functions continue to work unchanged.
