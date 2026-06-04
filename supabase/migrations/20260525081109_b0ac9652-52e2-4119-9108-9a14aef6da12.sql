REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Restrict bucket listing while keeping individual files publicly readable by URL
DROP POLICY IF EXISTS "Cover images are publicly viewable" ON storage.objects;
CREATE POLICY "Cover images are viewable by URL"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-covers' AND auth.role() = 'authenticated' OR bucket_id = 'post-covers');