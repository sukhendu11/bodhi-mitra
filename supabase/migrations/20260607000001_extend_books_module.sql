-- ============================================================================
-- Sabbe Satta — Extended Books Module
-- ============================================================================
-- Adds: purchases (idempotent), reading_progress, ratings (1-5 stars),
--       avg_rating/total_ratings on books table, and a private PDF bucket.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Add avg_rating & total_ratings to books table
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_books_avg_rating ON public.books (avg_rating DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Purchases table — idempotent per (user_id, book_id)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_book_id ON public.purchases (book_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases (purchase_date DESC);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Users can see their own purchases
CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- Users can insert their own purchases (idempotency enforced by UNIQUE)
CREATE POLICY "Users can insert own purchases"
  ON public.purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_purchases_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchases_updated_at ON public.purchases;
CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchases_timestamp();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Reading Progress table — per user per book, tracks last_page & completion
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_page INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  progress_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON public.reading_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON public.reading_progress (book_id);

-- Enable RLS
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Users can manage their own progress
CREATE POLICY "Users can view own reading progress"
  ON public.reading_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own reading progress"
  ON public.reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
  ON public.reading_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_reading_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reading_progress_updated_at ON public.reading_progress;
CREATE TRIGGER trg_reading_progress_updated_at
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reading_progress_timestamp();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Ratings table — one rating per user per book (1-5 stars)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.book_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_book_ratings_user_id ON public.book_ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_book_ratings_book_id ON public.book_ratings (book_id);
CREATE INDEX IF NOT EXISTS idx_book_ratings_rating ON public.book_ratings (rating);

-- Enable RLS
ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings (public aggregate data)
CREATE POLICY "Anyone can view ratings"
  ON public.book_ratings FOR SELECT
  USING (true);

-- Authenticated users can insert/update their own ratings
CREATE POLICY "Users can insert own ratings"
  ON public.book_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.book_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_book_ratings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_book_ratings_updated_at ON public.book_ratings;
CREATE TRIGGER trg_book_ratings_updated_at
  BEFORE UPDATE ON public.book_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_ratings_timestamp();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Function: update avg_rating + total_ratings after rating insert/update
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_book_rating_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  agg RECORD;
BEGIN
  SELECT
    AVG(rating)::NUMERIC(3, 2) AS avg_val,
    COUNT(*)::INTEGER AS total_val
  INTO agg
  FROM public.book_ratings
  WHERE book_id = COALESCE(NEW.book_id, OLD.book_id);

  UPDATE public.books
  SET
    avg_rating = COALESCE(agg.avg_val, 0.00),
    total_ratings = COALESCE(agg.total_val, 0)
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_book_ratings_update_aggregates ON public.book_ratings;
CREATE TRIGGER trg_book_ratings_update_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.book_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_rating_aggregates();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Private storage bucket for PDFs (signed URLs only)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-pdfs',
  'book-pdfs',
  false,  -- PRIVATE — never expose raw URLs
  104857600, -- 100 MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Admins can view/upload/manage private PDF files
CREATE POLICY "Admins can view book-pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'book-pdfs' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Admins can upload book-pdfs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'book-pdfs' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Admins can update book-pdfs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'book-pdfs' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can delete book-pdfs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'book-pdfs' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Also add RLS policy for authenticated users who purchased the book to view the PDF
CREATE POLICY "Purchasers can view book-pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'book-pdfs' AND (
      EXISTS (
        SELECT 1 FROM public.purchases
        WHERE book_id::text = (storage.foldername(name))[2]
        AND user_id = auth.uid()
      )
    )
  );
