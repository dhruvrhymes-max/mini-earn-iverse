CREATE TABLE public.ton_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('miner','coins')),
  miner_id uuid REFERENCES public.miners(id) ON DELETE SET NULL,
  amount_ton numeric NOT NULL CHECK (amount_ton > 0),
  tokens numeric NOT NULL DEFAULT 0,
  memo text NOT NULL UNIQUE,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired')),
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT ALL ON public.ton_invoices TO service_role;
ALTER TABLE public.ton_invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  reward numeric NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 100,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)
);
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ton_invoices_user ON public.ton_invoices(user_id, created_at DESC);
CREATE INDEX idx_promo_codes_tenant ON public.promo_codes(tenant_id);