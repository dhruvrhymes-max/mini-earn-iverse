
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS mini_app_short_name text,
  ADD COLUMN IF NOT EXISTS welcome_image_url text,
  ADD COLUMN IF NOT EXISTS welcome_text text,
  ADD COLUMN IF NOT EXISTS welcome_cta_text text;

-- Allow anon to read tenant by bot_token? No — bot_token stays server-only.
-- Edge function will use service role.
