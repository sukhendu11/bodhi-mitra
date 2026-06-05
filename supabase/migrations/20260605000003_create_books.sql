-- ============================================================================
-- Bodhi Mitra — Books Module (Shopify-style product system)
-- ============================================================================
-- Books behave like digital products. Each book has a PDF, optional cover image,
-- and can be free or paid. Future-ready for cart/payments integration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_bn TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  pdf_file_size INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_free BOOLEAN NOT NULL DEFAULT true,
  pages INTEGER NOT NULL DEFAULT 0,
  isbn TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  meta_description_en TEXT NOT NULL DEFAULT '',
  meta_description_bn TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_slug ON public.books (slug);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books (status);
CREATE INDEX IF NOT EXISTS idx_books_featured ON public.books (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_books_is_free ON public.books (is_free);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books (category);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_sort_order ON public.books (sort_order);

-- Full-text search on title and description
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title_en, '')) ||
    to_tsvector('bengali', coalesce(title_bn, '')) ||
    to_tsvector('english', coalesce(description_en, '')) ||
    to_tsvector('bengali', coalesce(description_bn, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_books_search ON public.books USING GIN (search_vector);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Publicly readable (published only for non-authenticated)
CREATE POLICY "Published books publicly readable"
  ON public.books FOR SELECT
  USING (
    status = 'published' OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'author')
  );

-- Content creators can insert
CREATE POLICY "Editors and above can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'author')
  );

-- Editors and above can update
CREATE POLICY "Editors and above can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor')
  );

-- Editors and above can delete
CREATE POLICY "Editors and above can delete books"
  ON public.books FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor')
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_books_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_books_timestamp();
