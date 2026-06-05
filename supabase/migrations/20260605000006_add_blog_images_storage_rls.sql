-- ============================================================================
-- Bodhi Mitra — Storage RLS policies for blog-images bucket
-- ============================================================================
-- The blog-images bucket was created earlier but didn't have storage-level RLS
-- policies. Adding them now for consistency with other buckets.
-- ============================================================================

-- Storage RLS policies for blog-images

CREATE POLICY "Blog-images publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated can upload blog-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Admins can update blog-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can delete blog-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );
