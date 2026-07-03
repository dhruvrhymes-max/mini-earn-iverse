
CREATE TABLE public.global_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  reward NUMERIC NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'social',
  daily_limit INT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_tasks TO authenticated;
GRANT ALL ON public.global_tasks TO service_role;
ALTER TABLE public.global_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admins manage global tasks" ON public.global_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.user_global_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.global_tasks(id) ON DELETE CASCADE,
  count INT NOT NULL DEFAULT 1,
  last_completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_global_tasks TO authenticated;
GRANT ALL ON public.user_global_tasks TO service_role;
ALTER TABLE public.user_global_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages user_global_tasks" ON public.user_global_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.miners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '⛏️',
  price_tokens NUMERIC NOT NULL DEFAULT 0,
  rate_boost_per_hour NUMERIC NOT NULL DEFAULT 0,
  duration_hours INT NOT NULL DEFAULT 24,
  is_free BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miners TO authenticated;
GRANT ALL ON public.miners TO service_role;
ALTER TABLE public.miners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant miners managed by owner" ON public.miners FOR ALL TO authenticated
  USING (public.is_tenant_owner(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_owner(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.user_miners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  miner_id UUID NOT NULL REFERENCES public.miners(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_miners TO authenticated;
GRANT ALL ON public.user_miners TO service_role;
ALTER TABLE public.user_miners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages user_miners" ON public.user_miners FOR ALL TO service_role USING (true) WITH CHECK (true);
