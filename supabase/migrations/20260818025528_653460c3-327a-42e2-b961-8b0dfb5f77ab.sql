ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS last_scratch_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_quiz_at timestamptz,
  ADD COLUMN IF NOT EXISTS quiz_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_forecast_at timestamptz,
  ADD COLUMN IF NOT EXISTS forecast_state jsonb NOT NULL DEFAULT '{}'::jsonb;