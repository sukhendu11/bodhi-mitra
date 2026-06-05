-- ============================================================================
-- Bodhi Mitra — Taxonomy System (Categories & Tags)
-- ============================================================================
-- Replaces the hardcoded post_category enum with a flexible, unified
-- taxonomy system. Categories and tags can be attached to any content type
-- (posts, books, pages) via polymorphic junction tables.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. CATEGORIES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_bn TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#d35400',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories (sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_visible ON public.categories (visible);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories publicly readable"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TAGS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#666',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags (slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags (name_en);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags publicly readable"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ════════════════════════════════════════════════════════════════════════════
-- 3. JUNCTION TABLES (Polymorphic tagging via content_type discriminator)
-- ════════════════════════════════════════════════════════════════════════════

-- Content-Category junction
CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'book', 'page')),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, content_type, category_id)
);

CREATE INDEX IF NOT EXISTS idx_cc_content ON public.content_categories (content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_cc_category ON public.content_categories (category_id);

ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content categories publicly readable"
  ON public.content_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage content categories"
  ON public.content_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Content-Tag junction
CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'book', 'page')),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, content_type, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_ct_content ON public.content_tags (content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ct_tag ON public.content_tags (tag_id);

ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content tags publicly readable"
  ON public.content_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage content tags"
  ON public.content_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ════════════════════════════════════════════════════════════════════════════
-- 4. SEED DEFAULT CATEGORIES (matching existing post_category enum values)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.categories (slug, name_en, name_bn, description_en, description_bn, color, sort_order, visible) VALUES
  ('buddhist-psychology', 'Buddhist Psychology', 'বৌদ্ধ মনোবিজ্ঞান',
   'Where the Buddha''s two-and-a-half-millennia of inquiry into the mind meets the evidence base of modern psychiatry.',
   'যেখানে বুদ্ধের আড়াই হাজার বছরের মনস্তাত্ত্বিক অনুসন্ধান আধুনিক মনোরোগবিদ্যার প্রমাণের সাথে মিলিত হয়।',
   '#d35400', 1, true),
  ('wisdom', 'Wisdom', 'প্রজ্ঞা',
   'Short meditations on attention, equanimity, and the texture of an examined life.',
   'মনোযোগ, সমতা এবং পরীক্ষিত জীবনের গঠন নিয়ে সংক্ষিপ্ত ধ্যান।',
   '#2d6a4f', 2, true),
  ('books', 'Books', 'বই',
   'A small shelf of companions — books we return to, and the ones we recommend without hesitation.',
   'সঙ্গীদের একটি ছোট তাক — যেসব বইয়ে আমরা ফিরে যাই, এবং যেগুলো নির্দ্বিধায় সুপারিশ করি।',
   '#7b2d8b', 3, true)
ON CONFLICT (slug) DO NOTHING;
