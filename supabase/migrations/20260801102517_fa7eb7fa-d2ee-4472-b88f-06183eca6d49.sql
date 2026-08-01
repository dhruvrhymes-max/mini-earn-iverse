ALTER TYPE public.ad_network ADD VALUE IF NOT EXISTS 'onclicka';
ALTER TYPE public.ad_network ADD VALUE IF NOT EXISTS 'custom';
ALTER TYPE public.ad_network ADD VALUE IF NOT EXISTS 'direct_link';
ALTER TYPE public.ad_network ADD VALUE IF NOT EXISTS 'ao_code';
ALTER TABLE public.ad_logs ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.ad_providers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ad_logs_provider_idx ON public.ad_logs(provider_id, user_id, created_at);