ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS idle_day timestamptz,
  ADD COLUMN IF NOT EXISTS idle_collects integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idle_ad_extends integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idle_bonus_hours numeric NOT NULL DEFAULT 0;