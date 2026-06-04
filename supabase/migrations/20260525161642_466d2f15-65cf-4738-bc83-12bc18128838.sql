
-- Site settings: single-row JSON config for all global site customization
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT site_settings_singleton CHECK (id = TRUE)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read site settings (needed for header, footer, hero, etc.)
CREATE POLICY "Site settings are publicly readable"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only admins can insert/update
CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the singleton row with sensible defaults
INSERT INTO public.site_settings (id, config) VALUES (
  TRUE,
  '{
    "branding": {
      "logo_url": "",
      "favicon_url": "",
      "site_name_en": "Bodhi Mitra",
      "site_name_bn": "বোধি মিত্র",
      "logo_max_width": 120
    },
    "hero": {
      "visible": true,
      "eyebrow_en": "❖ Bodhi Mitra",
      "eyebrow_bn": "❖ বোধি মিত্র",
      "title_en": "Where ancient wisdom\nmeets modern psychology.",
      "title_bn": "যেখানে প্রাচীন প্রজ্ঞা\nআধুনিক মনোবিজ্ঞানের সাথে মিলে।",
      "desc_en": "Quiet essays on the Buddha''s teachings, the science of the mind, and the slow art of becoming well.",
      "desc_bn": "বুদ্ধের শিক্ষা, মনের বিজ্ঞান, এবং সুস্থ হয়ে ওঠার ধীর শিল্প নিয়ে শান্ত প্রবন্ধ।",
      "cta_label": "Begin reading",
      "cta_url": "/buddhist-psychology"
    },
    "theme": {
      "accent_color": "#d35400",
      "accent_hover": "#e67e22",
      "mode": "light"
    },
    "nav": {
      "home_en": "Home", "home_bn": "Home",
      "bp_en": "Buddhist Psychology", "bp_bn": "Buddhist Psychology",
      "wisdom_en": "Wisdom", "wisdom_bn": "Wisdom",
      "books_en": "Books", "books_bn": "Books",
      "about_en": "About", "about_bn": "About"
    },
    "footer": {
      "copyright_en": "© {year} Bodhi Mitra. All rights reserved.",
      "copyright_bn": "© {year} বোধি মিত্র। সর্বস্বত্ব সংরক্ষিত।",
      "text_en": "Where ancient wisdom meets modern psychology.",
      "text_bn": "যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।"
    },
    "social": {
      "facebook": "", "twitter": "", "instagram": "", "linkedin": "", "youtube": ""
    },
    "contact": {
      "email": "", "phone": "", "location": ""
    },
    "seo": {
      "meta_desc_en": "A serene blog blending Buddhist teachings with modern mental health, by practicing psychiatrists.",
      "meta_desc_bn": "অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা বৌদ্ধ শিক্ষা ও আধুনিক মানসিক স্বাস্থ্যের সংমিশ্রণে একটি শান্ত ব্লগ।",
      "google_analytics_id": ""
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Public storage bucket for branding assets (logo, favicon)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Site assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets' AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

CREATE POLICY "Admins can update site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets' AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

CREATE POLICY "Admins can delete site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets' AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );
