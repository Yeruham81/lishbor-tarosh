
-- New global controls
INSERT INTO public.app_settings (key, value) VALUES
  ('ads_static_enabled', 'false'::jsonb),
  ('adsense_live_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Per-screen defaults. Only 'play' starts with any enabled positions.
-- Each screen gets: desktop layout, left/right/bottom enable, and slot IDs.
INSERT INTO public.app_settings (key, value) VALUES
  -- play (both-sides default, all toggles on so responsive layout drives visibility)
  ('ads_play_desktop_layout', '"both-sides"'::jsonb),
  ('ads_play_left_enabled', 'true'::jsonb),
  ('ads_play_right_enabled', 'true'::jsonb),
  ('ads_play_bottom_enabled', 'true'::jsonb),
  ('adsense_play_left_slot_id', '""'::jsonb),
  ('adsense_play_right_slot_id', '""'::jsonb),
  ('adsense_play_bottom_slot_id', '""'::jsonb),

  -- home
  ('ads_home_desktop_layout', '"bottom-only"'::jsonb),
  ('ads_home_left_enabled', 'false'::jsonb),
  ('ads_home_right_enabled', 'false'::jsonb),
  ('ads_home_bottom_enabled', 'false'::jsonb),
  ('adsense_home_left_slot_id', '""'::jsonb),
  ('adsense_home_right_slot_id', '""'::jsonb),
  ('adsense_home_bottom_slot_id', '""'::jsonb),

  -- levels
  ('ads_levels_desktop_layout', '"bottom-only"'::jsonb),
  ('ads_levels_left_enabled', 'false'::jsonb),
  ('ads_levels_right_enabled', 'false'::jsonb),
  ('ads_levels_bottom_enabled', 'false'::jsonb),
  ('adsense_levels_left_slot_id', '""'::jsonb),
  ('adsense_levels_right_slot_id', '""'::jsonb),
  ('adsense_levels_bottom_slot_id', '""'::jsonb),

  -- profile
  ('ads_profile_desktop_layout', '"bottom-only"'::jsonb),
  ('ads_profile_left_enabled', 'false'::jsonb),
  ('ads_profile_right_enabled', 'false'::jsonb),
  ('ads_profile_bottom_enabled', 'false'::jsonb),
  ('adsense_profile_left_slot_id', '""'::jsonb),
  ('adsense_profile_right_slot_id', '""'::jsonb),
  ('adsense_profile_bottom_slot_id', '""'::jsonb),

  -- leaderboard
  ('ads_leaderboard_desktop_layout', '"bottom-only"'::jsonb),
  ('ads_leaderboard_left_enabled', 'false'::jsonb),
  ('ads_leaderboard_right_enabled', 'false'::jsonb),
  ('ads_leaderboard_bottom_enabled', 'false'::jsonb),
  ('adsense_leaderboard_left_slot_id', '""'::jsonb),
  ('adsense_leaderboard_right_slot_id', '""'::jsonb),
  ('adsense_leaderboard_bottom_slot_id', '""'::jsonb),

  -- submit-puzzle (use underscore key form for column-safety)
  ('ads_submit_puzzle_desktop_layout', '"bottom-only"'::jsonb),
  ('ads_submit_puzzle_left_enabled', 'false'::jsonb),
  ('ads_submit_puzzle_right_enabled', 'false'::jsonb),
  ('ads_submit_puzzle_bottom_enabled', 'false'::jsonb),
  ('adsense_submit_puzzle_left_slot_id', '""'::jsonb),
  ('adsense_submit_puzzle_right_slot_id', '""'::jsonb),
  ('adsense_submit_puzzle_bottom_slot_id', '""'::jsonb),

  -- contact
  ('ads_contact_desktop_layout', '"bottom-only"'::jsonb),
  ('ads_contact_left_enabled', 'false'::jsonb),
  ('ads_contact_right_enabled', 'false'::jsonb),
  ('ads_contact_bottom_enabled', 'false'::jsonb),
  ('adsense_contact_left_slot_id', '""'::jsonb),
  ('adsense_contact_right_slot_id', '""'::jsonb),
  ('adsense_contact_bottom_slot_id', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Remove deprecated settings (replaced by per-screen play settings).
DELETE FROM public.app_settings
 WHERE key IN (
   'ads_post_solve_enabled',
   'ads_game_enabled',
   'adsense_post_solve_slot_id',
   'adsense_game_slot_id'
 );
