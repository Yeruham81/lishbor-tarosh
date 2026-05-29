
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "view_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  total_score INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  solved_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_username TEXT;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1), 'player_' || SUBSTR(NEW.id::text, 1, 8));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || FLOOR(RANDOM() * 1000)::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, v_username, COALESCE(NEW.raw_user_meta_data->>'display_name', v_username));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  clue TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  base_points INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clues TO authenticated;
GRANT ALL ON public.clues TO service_role;
ALTER TABLE public.clues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clues_select_active" ON public.clues FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "clues_admin_all" ON public.clues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER clues_touch BEFORE UPDATE ON public.clues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_clues_difficulty ON public.clues(difficulty) WHERE is_active = true;

CREATE TABLE public.game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clue_id UUID NOT NULL REFERENCES public.clues(id) ON DELETE CASCADE,
  revealed_letters TEXT[] NOT NULL DEFAULT '{}',
  wrong_guesses TEXT[] NOT NULL DEFAULT '{}',
  hints_used INTEGER NOT NULL DEFAULT 0,
  is_solved BOOLEAN NOT NULL DEFAULT false,
  score_earned INTEGER NOT NULL DEFAULT 0,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, clue_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_progress TO authenticated;
GRANT ALL ON public.game_progress TO service_role;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_own_select" ON public.game_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "progress_own_insert" ON public.game_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_own_update" ON public.game_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER progress_touch BEFORE UPDATE ON public.game_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_progress_user ON public.game_progress(user_id);

CREATE TABLE public.hint_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clue_id UUID NOT NULL REFERENCES public.clues(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  position INTEGER NOT NULL,
  cost INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hint_usage TO authenticated;
GRANT ALL ON public.hint_usage TO service_role;
ALTER TABLE public.hint_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hints_own_select" ON public.hint_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hints_own_insert" ON public.hint_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
