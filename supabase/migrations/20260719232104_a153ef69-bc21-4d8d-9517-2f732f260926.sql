INSERT INTO public.app_settings (key, value) VALUES
  ('ads_enabled', 'false'::jsonb),
  ('ads_test_mode', 'true'::jsonb),
  ('ads_post_solve_enabled', 'true'::jsonb),
  ('ads_game_enabled', 'false'::jsonb),
  ('h5_ads_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;