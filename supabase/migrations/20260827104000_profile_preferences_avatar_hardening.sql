-- Final profile hardening follow-up:
-- 1) merge preference patches atomically under a row lock;
-- 2) make avatar storage private, size/MIME constrained, and owner-scoped.

CREATE OR REPLACE FUNCTION public.update_profile_preferences_atomic(
  _user_id uuid,
  _is_private boolean DEFAULT NULL,
  _auto_next boolean DEFAULT NULL,
  _notification_patch jsonb DEFAULT NULL,
  _accessibility_patch jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_paid boolean;
BEGIN
  IF _notification_patch IS NOT NULL AND jsonb_typeof(_notification_patch) <> 'object' THEN
    RAISE EXCEPTION 'notification_patch_invalid';
  END IF;

  IF _accessibility_patch IS NOT NULL AND jsonb_typeof(_accessibility_patch) <> 'object' THEN
    RAISE EXCEPTION 'accessibility_patch_invalid';
  END IF;

  -- Serialize preference changes for this player. This prevents two quick
  -- toggles from reading the same old JSON and overwriting one another.
  SELECT is_paid
    INTO v_is_paid
    FROM public.profiles
   WHERE id = _user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF _auto_next IS TRUE AND NOT COALESCE(v_is_paid, false) THEN
    RAISE EXCEPTION 'premium_required';
  END IF;

  UPDATE public.profiles
     SET is_private = CASE WHEN _is_private IS NULL THEN is_private ELSE _is_private END,
         auto_next = CASE WHEN _auto_next IS NULL THEN auto_next ELSE _auto_next END,
         notification_prefs = CASE
           WHEN _notification_patch IS NULL THEN notification_prefs
           ELSE COALESCE(notification_prefs, '{}'::jsonb) || _notification_patch
         END,
         accessibility_prefs = CASE
           WHEN _accessibility_patch IS NULL THEN accessibility_prefs
           ELSE COALESCE(accessibility_prefs, '{}'::jsonb) || _accessibility_patch
         END
   WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_profile_preferences_atomic(uuid, boolean, boolean, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_profile_preferences_atomic(uuid, boolean, boolean, jsonb, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_preferences_atomic(uuid, boolean, boolean, jsonb, jsonb) TO service_role;

-- The avatar bucket is private. The Storage API enforces the payload limits,
-- while signed URLs are created server-side for profile/leaderboard display.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND cardinality(storage.foldername(name)) = 1
  AND storage.filename(name) ~ '^avatar-[^/]+\.(png|jpg|jpeg|webp|gif)$'
);
