-- ============================================================================
-- Bodhi Mitra — Pages Management
-- ============================================================================
-- Dedicated pages table extracted from the site_settings JSON blob.
-- Supports full CRUD, bilingual content, visibility toggles, and banners.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  header_en TEXT NOT NULL DEFAULT '',
  header_bn TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_bn TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  meta_description_en TEXT NOT NULL DEFAULT '',
  meta_description_bn TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages (slug);
CREATE INDEX IF NOT EXISTS idx_pages_visible ON public.pages (visible);
CREATE INDEX IF NOT EXISTS idx_pages_sort_order ON public.pages (sort_order);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Publicly readable
CREATE POLICY "Pages publicly readable"
  ON public.pages FOR SELECT
  USING (true);

-- Admins can insert
CREATE POLICY "Admins can insert pages"
  ON public.pages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

-- Admins can update
CREATE POLICY "Admins can update pages"
  ON public.pages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

-- Admins can delete
CREATE POLICY "Admins can delete pages"
  ON public.pages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pages_updated_at ON public.pages;
CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pages_timestamp();

-- Seed default pages from existing site settings defaults
INSERT INTO public.pages (slug, title_en, title_bn, header_en, header_bn, body_en, body_bn, visible, sort_order) VALUES
  ('buddhist-psychology', 'Buddhist Psychology', 'বৌদ্ধ মনোবিজ্ঞান', 'Buddhist Psychology', 'বৌদ্ধ মনোবিজ্ঞান',
   'Where the Buddha''s two-and-a-half-millennia of inquiry into the mind meets the evidence base of modern psychiatry.',
   'যেখানে বুদ্ধের আড়াই হাজার বছরের মনস্তাত্ত্বিক অনুসন্ধান আধুনিক মনোরোগবিদ্যার প্রমাণের সাথে মিলিত হয়।', true, 1),
  ('wisdom', 'Wisdom', 'প্রজ্ঞা', 'Wisdom', 'প্রজ্ঞা',
   'Short meditations on attention, equanimity, and the texture of an examined life.',
   'মনোযোগ, সমতা এবং পরীক্ষিত জীবনের গঠন নিয়ে সংক্ষিপ্ত ধ্যান।', true, 2),
  ('books', 'Books', 'বই', 'Books', 'বই',
   'A small shelf of companions — books we return to, and the ones we recommend without hesitation.',
   'সঙ্গীদের একটি ছোট তাক — যেসব বইয়ে আমরা ফিরে যাই, এবং যেগুলো নির্দ্বিধায় সুপারিশ করি।', true, 3),
  ('satsang', 'Satsang', 'সৎসঙ্গ', 'Satsang', 'সৎসঙ্গ',
   'Gatherings in good company — talks, retreats, and shared silence.',
   'সৎসঙ্গে সমাবেশ — আলোচনা, রিট্রিট এবং ভাগ করা নীরবতা।', false, 4)
ON CONFLICT (slug) DO NOTHING;
