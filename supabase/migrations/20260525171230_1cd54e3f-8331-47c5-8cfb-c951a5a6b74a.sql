
-- Fix: restrict bucket SELECT to specific files (not listing)
DROP POLICY IF EXISTS "public read tenant assets" ON storage.objects;
CREATE POLICY "public read tenant assets" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'tenant-assets' AND (storage.foldername(name))[1] IS NOT NULL);

-- Revoke broad execute on internal helpers (still callable in RLS context via SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_owner(UUID, UUID) FROM PUBLIC, anon;
