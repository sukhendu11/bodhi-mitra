-- ============================================================================
-- Bodhi Mitra — Section-Based Page System
-- ============================================================================
-- Adds a JSONB `sections` column to the pages table for section-based
-- content building. Each page can have multiple sections of types:
--   hero, text, image, quote, video, cta
-- ============================================================================

-- Add JSONB sections column
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing body_en/body_bn content into a text section so no data is lost
UPDATE public.pages
SET sections = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'text',
    'sort_order', 0,
    'content_en', jsonb_build_object('body', body_en),
    'content_bn', jsonb_build_object('body', body_bn)
  )
)
WHERE sections = '[]'::jsonb AND (body_en != '' OR body_bn != '');

-- GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_pages_sections ON public.pages USING GIN (sections);
