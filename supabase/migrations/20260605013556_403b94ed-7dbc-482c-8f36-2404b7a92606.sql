
-- 1) challenges: restrict SELECT to owner only (admin client handles public-by-token lookup)
DROP POLICY IF EXISTS "challenges_select_public" ON public.challenges;
CREATE POLICY "challenges_select_own"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = challenger_id);

-- 2) clues: hide the answer column from anon/authenticated; server uses service_role
REVOKE SELECT (answer) ON public.clues FROM anon, authenticated;

-- 3) game_progress: allow owners to delete their own rows
CREATE POLICY "progress_own_delete"
  ON public.game_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) user_roles: hard-deny all writes from non-service roles (defense-in-depth)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE POLICY "user_roles_no_insert"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "user_roles_no_update"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "user_roles_no_delete"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- 5) has_role: revoke direct EXECUTE from clients; RLS evaluation still works
--    because policies are evaluated with the function owner's rights when
--    the function is SECURITY DEFINER and referenced inside a policy.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
