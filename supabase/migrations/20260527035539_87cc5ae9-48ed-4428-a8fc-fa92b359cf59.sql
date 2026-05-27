
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='authenticated upload tenant-assets') THEN
    CREATE POLICY "authenticated upload tenant-assets" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'tenant-assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public read tenant-assets') THEN
    CREATE POLICY "public read tenant-assets" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'tenant-assets');
  END IF;
END$$;
