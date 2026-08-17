ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS game_mode text NOT NULL DEFAULT 'mine',
  ADD COLUMN IF NOT EXISTS payout_channel_url text;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS energy integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS energy_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_spin_at timestamptz,
  ADD COLUMN IF NOT EXISTS spin_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idle_collected_at timestamptz;

CREATE TABLE IF NOT EXISTS public.referral_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inviter_id, invitee_id)
);

GRANT SELECT ON public.referral_credits TO authenticated;
GRANT ALL ON public.referral_credits TO service_role;

ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read referral_credits" ON public.referral_credits
  FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_referral_credits_inviter_created
  ON public.referral_credits (inviter_id, created_at DESC);