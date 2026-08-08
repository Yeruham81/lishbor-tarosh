CREATE OR REPLACE FUNCTION public.is_registration_enabled()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (value)::text::boolean FROM public.app_settings WHERE key = 'allow_new_registrations'),
    true
  )
$$;

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
  v_provider TEXT;
BEGIN
  IF NOT public.is_registration_enabled() THEN
    RAISE EXCEPTION 'registrations_disabled'
      USING HINT = 'New registrations are currently disabled by the administrator.';
  END IF;

  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1), 'player_' || SUBSTR(NEW.id::text, 1, 8));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || FLOOR(RANDOM() * 1000)::text;
  END LOOP;

  v_display := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );
  v_confirmed := (NEW.raw_user_meta_data ? 'display_name');
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  INSERT INTO public.profiles (id, username, display_name, display_name_confirmed, email, auth_provider)
  VALUES (NEW.id, v_username, COALESCE(v_display, v_username), v_confirmed, NEW.email, v_provider);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;