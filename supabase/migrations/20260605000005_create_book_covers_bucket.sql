-- ============================================================================
-- Bodhi Mitra — Create book-covers storage bucket and RLS policies
-- ============================================================================
-- Creates the storage bucket for book covers and PDF files, with proper
-- RLS policies matching the existing pattern from post-covers/site-assets.
-- ============================================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  52428800, -- 50 MB (PDFs can be large)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for book-covers

CREATE POLICY "Book-covers publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Editors+ can upload book-covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'book-covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Admins can update book-covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'book-covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can delete book-covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'book-covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );
