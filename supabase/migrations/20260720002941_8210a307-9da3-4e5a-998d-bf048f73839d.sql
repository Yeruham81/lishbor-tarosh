INSERT INTO public.app_settings (key, value) VALUES
  ('adsense_publisher_id', to_jsonb(''::text)),
  ('adsense_post_solve_slot_id', to_jsonb(''::text)),
  ('adsense_game_slot_id', to_jsonb(''::text))
ON CONFLICT (key) DO NOTHING;