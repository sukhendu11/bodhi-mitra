-- ──────────────────────────────────────────────────────────────────
-- navigation_items: flexible menu builder for the site navigation
-- Supports nested items (via parent_id), internal/external/dropdown types,
-- bilingual labels, sort ordering, and visibility toggles.
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'internal'
    CHECK (type IN ('internal', 'external', 'dropdown')),
  label_en TEXT NOT NULL,
  label_bn TEXT NOT NULL DEFAULT '',
  url TEXT DEFAULT '',           -- for external links: full URL
  slug TEXT DEFAULT '',          -- for internal links: route path (e.g. "/books")
  icon TEXT DEFAULT '',          -- optional lucide icon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

-- ── RLS policies ─────────────────────────────────────────────────

CREATE POLICY "Anyone can read visible navigation items"
  ON public.navigation_items FOR SELECT
  TO anon, authenticated
  USING (visible = true);

CREATE POLICY "Authenticated users can read all items"
  ON public.navigation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert navigation items"
  ON public.navigation_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update navigation items"
  ON public.navigation_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete navigation items"
  ON public.navigation_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ── Indexes ──────────────────────────────────────────────────────

CREATE INDEX idx_nav_items_parent ON public.navigation_items(parent_id);
CREATE INDEX idx_nav_items_order ON public.navigation_items(sort_order);

-- ── Trigger: auto-update updated_at ──────────────────────────────

CREATE OR REPLACE FUNCTION public.update_nav_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nav_items_updated_at
  BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_nav_items_timestamp();

-- ── Seed default navigation items ────────────────────────────────
-- Default items for the dynamic menu builder. Admins can edit, reorder, and add items via CMS.

INSERT INTO public.navigation_items (id, type, label_en, label_bn, slug, sort_order, visible) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'internal', 'Home',    'Home',    '/',       1, true),
  ('a0000000-0000-0000-0000-000000000002', 'internal', 'Books',   'Books',   '/books',  2, true),
  ('a0000000-0000-0000-0000-000000000007', 'internal', 'Videos',  'Videos',  '/videos', 3, true),
  ('a0000000-0000-0000-0000-000000000003', 'dropdown', 'Philosophy', 'Philosophy', '', 4, true),
  ('a0000000-0000-0000-0000-000000000004', 'dropdown', 'Practice',   'Practice',   '', 5, true),
  ('a0000000-0000-0000-0000-000000000005', 'internal', 'About',  'About',  '/about',  6, true),
  ('a0000000-0000-0000-0000-000000000006', 'internal', 'Contact','Contact', '/contact', 7, true)
ON CONFLICT (id) DO NOTHING;

-- Dropdown children (Philosophy)
INSERT INTO public.navigation_items (parent_id, type, label_en, label_bn, slug, sort_order, visible) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'internal', 'Buddhism',        'Buddhism',        '/buddhist-psychology', 1, true),
  ('a0000000-0000-0000-0000-000000000003', 'internal', 'Mind (Buddhist Psychology)', 'Mind (Buddhist Psychology)', '/wisdom', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.navigation_items (parent_id, type, label_en, label_bn, slug, sort_order, visible) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'internal', 'Wellness (Mental Health Approach)', 'Wellness (Mental Health Approach)', '/satsang', 1, true),
  ('a0000000-0000-0000-0000-000000000004', 'internal', 'Today (Modern Relevance)',           'Today (Modern Relevance)',           '/',       2, true)
ON CONFLICT DO NOTHING;
