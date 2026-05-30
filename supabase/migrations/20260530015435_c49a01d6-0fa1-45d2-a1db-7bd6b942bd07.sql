
CREATE OR REPLACE FUNCTION public.sync_clue_rating_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_clue_rating_counts() FROM PUBLIC, anon, authenticated;
