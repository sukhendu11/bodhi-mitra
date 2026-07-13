-- Create content_collections for grouping content types
-- Phase 03: CMS Engine & Content Modeling — Organization & Validation

-- ============================================================================
-- Table: content_collections
-- Logical groupings for content types (e.g., "Blog", "Learning", "Resources")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT '#6b7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_collections_sort ON public.content_collections (sort_order ASC);

ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;

-- Only admins can manage collections
CREATE POLICY "Admins can manage collections"
  ON public.content_collections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Everyone can read collections
CREATE POLICY "Everyone can read collections"
  ON public.content_collections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read collections"
  ON public.content_collections
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Add collection_id to content_type_definitions
-- ============================================================================
ALTER TABLE public.content_type_definitions
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.content_collections(id) ON DELETE SET NULL;

CREATE INDEX idx_content_type_definitions_collection
  ON public.content_type_definitions (collection_id);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================
CREATE TRIGGER update_content_collections_timestamp
  BEFORE UPDATE ON public.content_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();

-- ============================================================================
-- Seed default collections
-- ============================================================================
INSERT INTO public.content_collections (name, slug, label, description, icon, color, sort_order) VALUES
  ('content', 'content', 'Content', 'Standard content types like posts and pages', 'FileText', '#3b82f6', 1),
  ('learning', 'learning', 'Learning', 'Educational content like courses and books', 'BookOpen', '#10b981', 2),
  ('media', 'media', 'Media', 'Media content like videos and podcasts', 'Video', '#f59e0b', 3),
  ('commerce', 'commerce', 'Commerce', 'Commerce content like products', 'ShoppingBag', '#ef4444', 4),
  ('community', 'community', 'Community', 'Community content like discussions', 'MessageSquare', '#8b5cf6', 5)
ON CONFLICT (name) DO NOTHING;
