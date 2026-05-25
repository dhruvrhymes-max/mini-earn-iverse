
-- Enums
CREATE TYPE app_role AS ENUM ('super_admin', 'bot_admin');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended');
CREATE TYPE task_kind AS ENUM ('social', 'partner', 'watch');
CREATE TYPE tx_type AS ENUM ('mine', 'task', 'ad', 'referral', 'convert', 'deposit', 'withdraw');
CREATE TYPE tx_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE ad_network AS ENUM ('adsgram', 'monetag', 'adexium');

-- Roles table (separate, per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Tenants (bots)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status tenant_status NOT NULL DEFAULT 'active',
  token_name TEXT NOT NULL DEFAULT 'Token',
  token_symbol TEXT NOT NULL DEFAULT 'TKN',
  token_icon_url TEXT,
  action_verb TEXT NOT NULL DEFAULT 'Mine',
  theme JSONB NOT NULL DEFAULT '{"primary":"#f59e0b","background":"#0a0a0a","accent":"#fbbf24"}'::jsonb,
  economics JSONB NOT NULL DEFAULT '{"token_per_usdt":10000,"min_withdraw_usdt":0.1,"mining_rate_per_hour":100,"mining_cycle_hours":4}'::jsonb,
  ad_config JSONB NOT NULL DEFAULT '{"adsgram":"","monetag":"","adexium":"","startup_ad_enabled":true,"daily_watch_limit":20}'::jsonb,
  community JSONB NOT NULL DEFAULT '{"channel_url":"","support_url":""}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id AND owner_user_id = _user_id)
$$;

-- App users (Telegram end-users, per tenant)
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  username TEXT,
  first_name TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  usd_balance NUMERIC NOT NULL DEFAULT 0,
  mining_started_at TIMESTAMPTZ,
  last_claim_at TIMESTAMPTZ,
  referrer_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  referral_count INT NOT NULL DEFAULT 0,
  wallet_polygon TEXT,
  wallet_bep20 TEXT,
  wallet_ton TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  startup_ad_shown_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, telegram_id)
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind task_kind NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  reward NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  daily_limit INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- User tasks
CREATE TABLE public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  count INT NOT NULL DEFAULT 1,
  last_completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- Ad logs
CREATE TABLE public.ad_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  network ad_network NOT NULL,
  reward NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_logs ENABLE ROW LEVEL SECURITY;

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TOKEN',
  status tx_status NOT NULL DEFAULT 'approved',
  wallet TEXT,
  network TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Referral milestones
CREATE TABLE public.referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  threshold INT NOT NULL,
  reward NUMERIC NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;

-- Announcements (super-admin global)
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- user_roles: users can read own; super_admin all
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "super admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- tenants
CREATE POLICY "owners read own tenants" ON public.tenants FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "authenticated create tenant" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "owners update own tenant" ON public.tenants FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "super admin delete tenant" ON public.tenants FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Public view for end-user mini-app boot (minimal columns by slug)
CREATE VIEW public.tenants_public WITH (security_invoker=on) AS
  SELECT id, slug, name, status, token_name, token_symbol, token_icon_url,
         action_verb, theme, economics, ad_config, community
  FROM public.tenants WHERE status = 'active';

CREATE POLICY "anon read active tenants" ON public.tenants FOR SELECT TO anon
  USING (status = 'active');

-- Helper: tenant-scoped owner-or-super check
-- Used inline below.

-- app_users
CREATE POLICY "owner read tenant users" ON public.app_users FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));
-- writes via service role only

-- tasks
CREATE POLICY "owner manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "anon read active tasks" ON public.tasks FOR SELECT TO anon
  USING (active = true);

-- user_tasks (read for owner)
CREATE POLICY "owner read user_tasks" ON public.user_tasks FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ad_logs (read for owner)
CREATE POLICY "owner read ad_logs" ON public.ad_logs FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- transactions
CREATE POLICY "owner read transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "owner update withdraw" ON public.transactions FOR UPDATE TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- referral_milestones
CREATE POLICY "owner manage milestones" ON public.referral_milestones FOR ALL TO authenticated
  USING (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_owner(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "anon read milestones" ON public.referral_milestones FOR SELECT TO anon
  USING (true);

-- announcements
CREATE POLICY "anyone read active announcements" ON public.announcements FOR SELECT TO authenticated, anon
  USING (active = true);
CREATE POLICY "super admin manages announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read tenant assets" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'tenant-assets');
CREATE POLICY "authenticated upload tenant assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-assets');
CREATE POLICY "owners update tenant assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-assets' AND owner = auth.uid());

-- Auto-create bot_admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'bot_admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
