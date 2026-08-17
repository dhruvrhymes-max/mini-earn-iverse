-- Bakes / miners pricing
ALTER TABLE public.miners
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'token',
  ADD COLUMN IF NOT EXISTS price_ton numeric NOT NULL DEFAULT 0;

-- Members: moderation + tracking
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_kind text,
  ADD COLUMN IF NOT EXISTS last_ip text,
  ADD COLUMN IF NOT EXISTS welcome_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ads_watched integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ton_deposited numeric NOT NULL DEFAULT 0;

-- Withdrawal rejection reason
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reject_reason text;

-- Bot-level configuration blobs
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS payout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deposit_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS security jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proof_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Join-address log (server-only)
CREATE TABLE IF NOT EXISTS public.ip_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ip_logs_tenant_ip_idx ON public.ip_logs (tenant_id, ip);
GRANT ALL ON public.ip_logs TO service_role;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ip_logs owner read" ON public.ip_logs FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- Verification (check) bots managed by the platform owner
CREATE TABLE IF NOT EXISTS public.check_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  bot_token text NOT NULL,
  bot_username text,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_bots TO authenticated;
GRANT ALL ON public.check_bots TO service_role;
ALTER TABLE public.check_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "check_bots super admin all" ON public.check_bots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_check_bots_updated_at BEFORE UPDATE ON public.check_bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();