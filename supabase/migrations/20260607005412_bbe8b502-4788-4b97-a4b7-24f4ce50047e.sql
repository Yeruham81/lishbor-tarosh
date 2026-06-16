
-- Fix #1: clue_ratings missing grants caused like/dislike to fail
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clue_ratings TO authenticated;
GRANT ALL ON public.clue_ratings TO service_role;


