CREATE TABLE public.account_approvals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_approvals TO authenticated;
GRANT ALL ON public.account_approvals TO service_role;

ALTER TABLE public.account_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own approval"
ON public.account_approvals FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins manage approvals"
ON public.account_approvals FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_account_approvals_updated_at
BEFORE UPDATE ON public.account_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Existing members stay approved
INSERT INTO public.account_approvals (user_id, email, status, reviewed_at)
SELECT id, email, 'approved', now() FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- New sign-ups land as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'bot_admin')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.account_approvals (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_account_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'super_admin')
    OR EXISTS (SELECT 1 FROM public.account_approvals WHERE user_id = _user_id AND status = 'approved');
$function$;