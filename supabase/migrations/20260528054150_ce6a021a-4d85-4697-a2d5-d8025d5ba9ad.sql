
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS theme_preset text;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE lower(email) = 'dhruvrhymes@gmail.com'
ON CONFLICT DO NOTHING;
