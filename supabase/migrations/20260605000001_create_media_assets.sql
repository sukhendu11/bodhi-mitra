-- ============================================================================
-- Bodhi Mitra — Media Assets Library
-- ============================================================================
-- Centralized media management table. All uploaded assets (images, PDFs, etc.)
-- are tracked here regardless of which storage bucket they live in.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  bucket TEXT NOT NULL DEFAULT 'blog-images',
  alt_text TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search vector for filename search
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(filename, ''))) STORED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_bucket ON public.media_assets (bucket);
CREATE INDEX IF NOT EXISTS idx_media_assets_mime_type ON public.media_assets (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON public.media_assets (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_assets_search ON public.media_assets USING GIN (search_vector);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Publicly readable (for displayed images)
CREATE POLICY "Media assets publicly readable"
  ON public.media_assets FOR SELECT
  USING (true);

-- Authenticated users can insert their own uploads
CREATE POLICY "Authenticated can insert media assets"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

-- Admins can update any asset
CREATE POLICY "Admins can update media assets"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Admins can delete assets
CREATE POLICY "Admins can delete media assets"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_media_assets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_assets_timestamp();
