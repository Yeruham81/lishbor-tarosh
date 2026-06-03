
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name_confirmed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_username TEXT;
  v_display TEXT;
  v_confirmed BOOLEAN;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1), 'player_' || SUBSTR(NEW.id::text, 1, 8));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || FLOOR(RANDOM() * 1000)::text;
  END LOOP;

  -- Try to pull a display name from common provider metadata keys
  v_display := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );

  -- Mark as confirmed only if the explicit "display_name" key was provided
  -- (this is set by our email signup form). Provider-supplied names are
  -- shown as a suggestion and require explicit user confirmation.
  v_confirmed := (NEW.raw_user_meta_data ? 'display_name');

  INSERT INTO public.profiles (id, username, display_name, display_name_confirmed)
  VALUES (NEW.id, v_username, COALESCE(v_display, v_username), v_confirmed);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;
