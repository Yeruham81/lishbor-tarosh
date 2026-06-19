
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_level smallint CHECK (player_level IS NULL OR player_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2);

INSERT INTO public.app_settings(key, value) VALUES
  ('disable_ads_button_visible', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('maintenance_message', '"המשחק בתחזוקה, נחזור בקרוב."'::jsonb)
ON CONFLICT (key) DO NOTHING;
