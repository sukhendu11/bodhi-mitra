-- ============================================================================
-- Bodhi Mitra — Phase 05: Digital Asset Management (DAM) System
-- ============================================================================
-- Adds folder organization, tagging, favorites, version history, and usage
-- tracking for the centralized media library.
-- ============================================================================

-- ============================================================================
-- 1. Media Folders (hierarchical organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'blog-images',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON public.media_folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_bucket ON public.media_folders (bucket);

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media folders publicly readable"
  ON public.media_folders FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert folders"
  ON public.media_folders FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update folders"
  ON public.media_folders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete folders"
  ON public.media_folders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- 2. Folder path trigger (auto-generate breadcrumb path)
-- ============================================================================

ALTER TABLE public.media_folders ADD COLUMN IF NOT EXISTS path TEXT;
CREATE INDEX IF NOT EXISTS idx_media_folders_path ON public.media_folders (path);

-- ============================================================================
-- 3. Extend media_assets with DAM columns
-- ============================================================================

ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.media_folders(id) ON DELETE SET NULL;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS duration NUMERIC; -- for audio/video (seconds)
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS checksum TEXT; -- for deduplication
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS original_filename TEXT; -- original name before any rename

CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.media_assets (folder_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_is_private ON public.media_assets (is_private);
CREATE INDEX IF NOT EXISTS idx_media_assets_checksum ON public.media_assets (checksum);

-- ============================================================================
-- 4. Media Asset Tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_tags_slug ON public.media_tags (slug);

ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media tags publicly readable"
  ON public.media_tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.media_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Junction table
CREATE TABLE IF NOT EXISTS public.media_asset_tags (
  asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.media_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_media_asset_tags_asset ON public.media_asset_tags (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_tags_tag ON public.media_asset_tags (tag_id);

ALTER TABLE public.media_asset_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media asset tags publicly readable"
  ON public.media_asset_tags FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage asset tags"
  ON public.media_asset_tags FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. Media Favorites (per-user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_media_favorites_user ON public.media_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_media_favorites_asset ON public.media_favorites (asset_id);

ALTER TABLE public.media_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON public.media_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. Media Asset Versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_versions_asset ON public.media_asset_versions (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_versions_number ON public.media_asset_versions (asset_id, version_number DESC);

ALTER TABLE public.media_asset_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media versions publicly readable"
  ON public.media_asset_versions FOR SELECT USING (true);

CREATE POLICY "Admins can insert versions"
  ON public.media_asset_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- 7. Media Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'post', 'page', 'book', 'product', 'form', etc.
  resource_id UUID NOT NULL,
  field_name TEXT, -- which field uses this asset (e.g., 'cover_image', 'content')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, resource_type, resource_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_media_usage_asset ON public.media_usage (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_usage_resource ON public.media_usage (resource_type, resource_id);

ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media usage publicly readable"
  ON public.media_usage FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert usage"
  ON public.media_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete usage"
  ON public.media_usage FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 8. New Storage Buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('audio', 'audio', true, 52428800, '{audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/flac,audio/mp4}'),
  ('documents', 'documents', true, 104857600, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet}'),
  ('videos', 'videos', true, 536870912, '{video/mp4,video/webm,video/ogg,video/quicktime}'),
  ('fonts', 'fonts', true, 10485760, '{font/ttf,font/otf,font/woff,font/woff2}'),
  ('icons', 'icons', true, 10485760, '{image/svg+xml,image/png,image/x-icon}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. Storage RLS Policies
-- ============================================================================

-- Public buckets (anyone can read)
CREATE POLICY "Public storage read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('blog-images', 'site-assets', 'book-covers', 'avatars', 'audio', 'documents', 'videos', 'fonts', 'icons'));

-- Authenticated users can upload to any public bucket
CREATE POLICY "Authenticated storage insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('blog-images', 'site-assets', 'book-covers', 'avatars', 'audio', 'documents', 'videos', 'fonts', 'icons'));

-- Admins can update/delete
CREATE POLICY "Admin storage update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Admin storage delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- ============================================================================
-- 10. Version tracking trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_media_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.media_asset_versions (
    asset_id, url, path, filename, file_size, mime_type,
    width, height, version_number, change_note, created_by
  )
  VALUES (
    NEW.id, NEW.url, NEW.path, NEW.filename, NEW.file_size, NEW.mime_type,
    NEW.width, NEW.height,
    (SELECT COALESCE(MAX(version_number), 0) + 1 FROM public.media_asset_versions WHERE asset_id = NEW.id),
    'Initial upload',
    NEW.uploaded_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_media_create_version ON public.media_assets;
CREATE TRIGGER trg_media_create_version
  AFTER INSERT ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_media_version();
