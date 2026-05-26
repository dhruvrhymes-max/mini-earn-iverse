ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bot_token text,
  ADD COLUMN IF NOT EXISTS bot_username text;

-- Revoke direct client access to bot_token by making the column readable only via service role.
-- We rely on server functions (supabaseAdmin) to read it; client SELECT policies already exist but
-- we restrict the column via column-level privileges.
REVOKE SELECT (bot_token) ON public.tenants FROM anon, authenticated;