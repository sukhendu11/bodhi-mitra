ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_bn text,
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS content_bn text,
  ADD COLUMN IF NOT EXISTS excerpt_en text,
  ADD COLUMN IF NOT EXISTS excerpt_bn text;

UPDATE public.posts
  SET title_en = COALESCE(title_en, title),
      content_en = COALESCE(content_en, content),
      excerpt_en = COALESCE(excerpt_en, excerpt)
  WHERE title_en IS NULL OR content_en IS NULL OR excerpt_en IS NULL;

ALTER TABLE public.posts ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN content DROP NOT NULL;