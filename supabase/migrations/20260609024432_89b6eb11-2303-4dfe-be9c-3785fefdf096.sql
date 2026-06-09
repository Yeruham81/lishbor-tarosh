-- 1) Allow callers to evaluate has_role inside policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- 2) Make the rating-count trigger run as definer so it can update clues
--    even when the rater is not an admin. The trigger reads/writes only
--    public.clues counter columns, so this is safe.
CREATE OR REPLACE FUNCTION public.sync_clue_rating_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.rating = 1 THEN UPDATE public.clues SET likes_count = likes_count + 1 WHERE id = NEW.clue_id;
    ELSE UPDATE public.clues SET dislikes_count = dislikes_count + 1 WHERE id = NEW.clue_id; END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.rating <> NEW.rating THEN
    IF NEW.rating = 1 THEN
      UPDATE public.clues SET likes_count = likes_count + 1, dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = NEW.clue_id;
    ELSE
      UPDATE public.clues SET dislikes_count = dislikes_count + 1, likes_count = GREATEST(0, likes_count - 1) WHERE id = NEW.clue_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.rating = 1 THEN UPDATE public.clues SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.clue_id;
    ELSE UPDATE public.clues SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = OLD.clue_id; END IF;
  END IF;
  RETURN NULL;
END; $function$;

-- 3) Expand clues schema (nullable, backward compatible)
ALTER TABLE public.clues
  ADD COLUMN IF NOT EXISTS hint TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS alt_answer TEXT;
