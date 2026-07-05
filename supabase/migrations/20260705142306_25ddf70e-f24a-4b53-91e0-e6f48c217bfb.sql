-- Extend miners for richer marketplace cards
ALTER TABLE public.miners ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.miners ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common';
ALTER TABLE public.miners ADD COLUMN IF NOT EXISTS description text;

-- Pluggable ad providers per tenant
CREATE TABLE IF NOT EXISTS public.ad_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('monetag','adsgram','onclicka','custom')),
  label text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_tokens numeric NOT NULL DEFAULT 0,
  daily_cap integer NOT NULL DEFAULT 20,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_providers TO authenticated;
GRANT ALL ON public.ad_providers TO service_role;

ALTER TABLE public.ad_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_providers readable" ON public.ad_providers FOR SELECT USING (true);
CREATE POLICY "ad_providers tenant owner manage" ON public.ad_providers FOR ALL
  USING (public.is_tenant_owner(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_owner(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_ad_providers_tenant ON public.ad_providers(tenant_id);