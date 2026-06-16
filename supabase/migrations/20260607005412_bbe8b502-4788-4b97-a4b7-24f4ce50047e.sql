
-- Fix #1: clue_ratings missing grants caused like/dislike to fail
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clue_ratings TO authenticated;
GRANT ALL ON public.clue_ratings TO service_role;

-- Security fix: hide other users' emails. The owner reads their email via supabase.auth (auth.users), not via profiles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN
    REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;
  END IF;
END $$;

-- Security fix: hide clue answers from clients. Only supabaseAdmin (service_role) can read.
REVOKE SELECT (answer) ON public.clues FROM anon, authenticated;
