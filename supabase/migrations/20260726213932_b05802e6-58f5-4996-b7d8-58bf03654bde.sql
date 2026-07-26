-- Seed per-screen ad enable flags used by the current advertising
-- infrastructure. Idempotent: existing values are preserved via
-- ON CONFLICT (key) DO NOTHING. Legacy ad settings remain untouched.

INSERT INTO public.app_settings (key, value) VALUES
  ('ads_play_enabled',          'true'::jsonb),
  ('ads_home_enabled',          'true'::jsonb),
  ('ads_levels_enabled',        'true'::jsonb),
  ('ads_profile_enabled',       'true'::jsonb),
  ('ads_leaderboard_enabled',   'true'::jsonb),
  ('ads_submit_puzzle_enabled', 'true'::jsonb),
  ('ads_contact_enabled',       'true'::jsonb)
ON CONFLICT (key) DO NOTHING;