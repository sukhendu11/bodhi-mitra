-- ============================================================================
-- Full-Text Search Indexes
-- ============================================================================

-- Enable pg_trgm extension for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Posts: tsvector on title + excerpt
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(excerpt_en, '') || ' ' ||
      coalesce(excerpt_bn, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search ON public.posts USING GIN (search_vector);

-- Pages: tsvector on title + header
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(header_en, '') || ' ' ||
      coalesce(header_bn, '') || ' ' ||
      coalesce(meta_description_en, '') || ' ' ||
      coalesce(meta_description_bn, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_pages_search ON public.pages USING GIN (search_vector);

-- Books: tsvector on title + description + author + category
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(description_en, '') || ' ' ||
      coalesce(description_bn, '') || ' ' ||
      coalesce(author_name, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_books_search ON public.books USING GIN (search_vector);

-- Videos: tsvector on title + description
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(description_en, '') || ' ' ||
      coalesce(description_bn, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_videos_search ON public.videos USING GIN (search_vector);

-- Courses: tsvector on title + description
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(description_en, '') || ' ' ||
      coalesce(description_bn, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_courses_search ON public.courses USING GIN (search_vector);

-- Search analytics table
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_result_id TEXT,
  clicked_result_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics (query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON public.search_analytics (created_at DESC);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can read search analytics
DROP POLICY IF EXISTS "Admins can read search analytics" ON public.search_analytics;
CREATE POLICY "Admins can read search analytics"
  ON public.search_analytics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert search analytics
DROP POLICY IF EXISTS "Anyone can insert search analytics" ON public.search_analytics;
CREATE POLICY "Anyone can insert search analytics"
  ON public.search_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert search analytics" ON public.search_analytics;
CREATE POLICY "Authenticated can insert search analytics"
  ON public.search_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);
