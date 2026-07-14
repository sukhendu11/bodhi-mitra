-- Add view counts to content tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Indexes for trending queries
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON public.posts (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_books_view_count ON public.books (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_courses_view_count ON public.courses (view_count DESC);
