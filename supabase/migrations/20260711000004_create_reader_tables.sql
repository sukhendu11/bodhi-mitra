-- Reader Module: page-level bookmarks, notes, and highlights for PDF reading

/* ─── Reader Bookmarks (page-level within a book) ─────────────── */

CREATE TABLE IF NOT EXISTS public.reader_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  label TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id, page_number)
);

ALTER TABLE public.reader_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reader_bookmarks_user_book
  ON public.reader_bookmarks (user_id, book_id);

CREATE INDEX IF NOT EXISTS idx_reader_bookmarks_user_book_page
  ON public.reader_bookmarks (user_id, book_id, page_number);

DO $$ BEGIN
  CREATE POLICY "Users can read own reader bookmarks"
    ON public.reader_bookmarks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own reader bookmarks"
    ON public.reader_bookmarks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reader bookmarks"
    ON public.reader_bookmarks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ─── Reader Notes (page-level within a book) ──────────────────── */

CREATE TABLE IF NOT EXISTS public.reader_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT '#fef08a',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reader_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reader_notes_user_book
  ON public.reader_notes (user_id, book_id);

DO $$ BEGIN
  CREATE POLICY "Users can read own reader notes"
    ON public.reader_notes FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own reader notes"
    ON public.reader_notes FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own reader notes"
    ON public.reader_notes FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reader notes"
    ON public.reader_notes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ─── Reader Highlights (future-ready) ─────────────────────────── */

CREATE TABLE IF NOT EXISTS public.reader_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#fef08a',
  selection_text TEXT NOT NULL,
  position_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reader_highlights ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reader_highlights_user_book
  ON public.reader_highlights (user_id, book_id);

DO $$ BEGIN
  CREATE POLICY "Users can read own reader highlights"
    ON public.reader_highlights FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own reader highlights"
    ON public.reader_highlights FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reader highlights"
    ON public.reader_highlights FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
