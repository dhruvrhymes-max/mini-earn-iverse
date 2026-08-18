CREATE TABLE IF NOT EXISTS public.bot_admin_sessions (
  tenant_id uuid NOT NULL,
  tg_id bigint NOT NULL,
  mode text NOT NULL,
  target_tg bigint,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, tg_id)
);
GRANT ALL ON public.bot_admin_sessions TO service_role;
ALTER TABLE public.bot_admin_sessions ENABLE ROW LEVEL SECURITY;