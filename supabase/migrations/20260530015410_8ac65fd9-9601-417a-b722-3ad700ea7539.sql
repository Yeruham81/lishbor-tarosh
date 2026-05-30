
-- Ratings
CREATE TABLE public.clue_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clue_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, clue_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clue_ratings TO authenticated;
GRANT ALL ON public.clue_ratings TO service_role;
ALTER TABLE public.clue_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ratings_select_own ON public.clue_ratings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ratings_insert_own ON public.clue_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ratings_update_own ON public.clue_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ratings_delete_own ON public.clue_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_clue_ratings_touch BEFORE UPDATE ON public.clue_ratings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Feedback / contact
CREATE TYPE public.feedback_type AS ENUM ('bug', 'feature', 'complaint', 'idea', 'other');
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type public.feedback_type NOT NULL DEFAULT 'other',
  subject text,
  message text NOT NULL CHECK (length(message) BETWEEN 3 AND 4000),
  contact_email text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_insert_any_auth ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY feedback_admin_all ON public.feedback FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Challenges (shareable links)
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  challenger_id uuid NOT NULL,
  clue_id uuid NOT NULL,
  challenger_score integer NOT NULL DEFAULT 0,
  challenger_wrong integer NOT NULL DEFAULT 0,
  challenger_hints integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenges_token ON public.challenges(token);
GRANT SELECT, INSERT ON public.challenges TO authenticated;
GRANT SELECT ON public.challenges TO anon;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
-- Anyone with the link can view the challenge meta (no PII beyond ids/scores)
CREATE POLICY challenges_select_public ON public.challenges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY challenges_insert_own ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);

-- Aggregate counters on clues for analytics
ALTER TABLE public.clues
  ADD COLUMN likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN dislikes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN skip_count integer NOT NULL DEFAULT 0,
  ADD COLUMN solved_count integer NOT NULL DEFAULT 0;

-- Trigger to maintain like/dislike counters
CREATE OR REPLACE FUNCTION public.sync_clue_rating_counts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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

CREATE TRIGGER trg_clue_ratings_counts
AFTER INSERT OR UPDATE OR DELETE ON public.clue_ratings
FOR EACH ROW EXECUTE FUNCTION public.sync_clue_rating_counts();
