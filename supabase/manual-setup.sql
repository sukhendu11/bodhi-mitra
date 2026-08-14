-- ============================================================================
-- Sabbe Satta - Fresh Supabase Instance: Complete Manual Setup SQL
-- ============================================================================
-- HOW TO USE
--   1. Create a NEW Supabase project (supabase.com -> New project).
--   2. Open Dashboard -> SQL Editor -> New query.
--   3. Paste this entire file and press Run.
--   4. Finish the dashboard-only steps in PROJECT.md section 18 (Manual Setup Kit).
--
-- SOURCE OF TRUTH: supabase/migrations/*.sql (this file is generated from them).
-- Regenerate (from the supabase/ folder):
--   for f in migrations/*.sql; do echo "-- [$f]"; cat "$f"; echo; done > manual-setup.sql
--
-- NOTES
--   - Concatenates all migrations in filename order (61 files).
--   - supabase/seed.sql (sample data) is intentionally NOT included - it requires
--     a real auth user UUID. Run it later only if you want demo data.
-- ============================================================================

-- ================= [ 1 ] 20260525061008_5d1e3364-d8dd-45bf-9884-4055027b57b4.sql =================

CREATE TYPE public.post_category AS ENUM ('Buddhist Psychology', 'Wisdom', 'Books');

CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  cover_image TEXT,
  category post_category NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Bodhi Mitra',
  excerpt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_category ON public.posts(category);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are publicly viewable"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
ON public.posts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete posts"
ON public.posts FOR DELETE
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.posts (title, slug, category, excerpt, cover_image, content) VALUES
('The Four Noble Truths and Cognitive Behavioral Therapy', 'four-noble-truths-cbt', 'Buddhist Psychology', 'How the Buddha''s foundational teaching mirrors the framework of modern CBT in understanding suffering.', null,
'The Four Noble Truths form the cornerstone of Buddhist philosophy, articulated over 2,500 years ago. Remarkably, they share a profound structural resemblance to Cognitive Behavioral Therapy (CBT), one of the most evidence-based psychological treatments today.

The first truth acknowledges suffering (dukkha). In therapy, we begin by validating the patient''s pain. The second identifies craving and aversion as causes — much like CBT''s identification of maladaptive thought patterns. The third offers hope: cessation is possible. The fourth provides the path — a structured method, parallel to a treatment plan.

When we sit with a patient and gently map their distress, we are walking an ancient road in modern shoes.'),

('On Letting Go: Anatta and the Self in Therapy', 'anatta-self-therapy', 'Buddhist Psychology', 'Exploring the Buddhist teaching of non-self alongside contemporary theories of identity and ego.', null,
'The doctrine of anatta, or non-self, is often misunderstood. It does not deny that we exist; it questions the solidity of the self we cling to.

In clinical practice, much suffering arises from a rigid self-concept — "I am a failure," "I am unlovable." When we loosen identification with these stories, healing begins. The self becomes a process, not a prison.'),

('The Quiet Mind: A Daily Practice', 'quiet-mind-daily-practice', 'Wisdom', 'Simple reflections on cultivating stillness amidst the noise of modern life.', null,
'Stillness is not the absence of sound. It is the presence of attention. Each morning, before the day claims you, sit. Breathe. Notice. Begin again.'),

('Why We Suffer in Comparison', 'suffering-comparison', 'Wisdom', 'A meditation on envy, social media, and the art of returning to one''s own path.', null,
'Comparison is the thief of presence. When we measure our inner life against another''s outer display, we trade what is real for what only seems.'),

('Review: "When Things Fall Apart" by Pema Chödrön', 'review-when-things-fall-apart', 'Books', 'A timeless companion for navigating chaos with tenderness and courage.', null,
'Pema Chödrön writes as though she is sitting beside you in your darkest hour. This book does not promise to fix you — it teaches you to stay.'),

('Review: "Full Catastrophe Living" by Jon Kabat-Zinn', 'review-full-catastrophe-living', 'Books', 'The foundational text on mindfulness-based stress reduction, and why it still matters.', null,
'Kabat-Zinn bridges the contemplative and the clinical. This is not a book to read once, but a manual to return to across the seasons of a life.');


-- ================= [ 2 ] 20260525061111_e5b44828-f860-42bf-bb7a-39c92d31bae3.sql =================

DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON public.posts;


-- ================= [ 3 ] 20260525080956_5634e2cd-d380-4b74-a70e-bf5f4e2bb967.sql =================
-- Roles enum and table (separate from profiles for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment_text TEXT NOT NULL CHECK (char_length(comment_text) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON public.comments(post_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are publicly viewable"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments; admins can delete any"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admin policies on posts
CREATE POLICY "Admins can insert posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for post cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-covers', 'post-covers', true);

CREATE POLICY "Cover images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-covers');

CREATE POLICY "Admins can upload cover images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cover images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cover images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-covers' AND public.has_role(auth.uid(), 'admin'));

-- ================= [ 4 ] 20260525081109_b0ac9652-52e2-4119-9108-9a14aef6da12.sql =================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Restrict bucket listing while keeping individual files publicly readable by URL
DROP POLICY IF EXISTS "Cover images are publicly viewable" ON storage.objects;
CREATE POLICY "Cover images are viewable by URL"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-covers' AND auth.role() = 'authenticated' OR bucket_id = 'post-covers');

-- ================= [ 5 ] 20260525095330_f8be8722-4b4b-4804-a4d7-a5392b3465a4.sql =================
CREATE TYPE public.post_status AS ENUM ('draft', 'published');

ALTER TABLE public.posts
  ADD COLUMN status public.post_status NOT NULL DEFAULT 'draft';

UPDATE public.posts SET status = 'published' WHERE status = 'draft';

DROP POLICY IF EXISTS "Posts are publicly viewable" ON public.posts;

CREATE POLICY "Published posts are publicly viewable"
ON public.posts
FOR SELECT
USING (status = 'published' OR has_role(auth.uid(), 'admin'::app_role));

-- ================= [ 6 ] 20260525095646_b5e394ec-c365-4d68-a508-4f41d754f6fc.sql =================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ================= [ 7 ] 20260525102912_99b664db-15af-4601-81ce-552d9bc17723.sql =================
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- ================= [ 8 ] 20260525103023_3f9163d6-8526-400a-8d6b-3e89090136fa.sql =================
-- Stop exposing the SECURITY DEFINER role helper through the public API roles.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;

-- Posts: split public published reads from admin reads, and use direct role lookup.
DROP POLICY IF EXISTS "Published posts are publicly viewable" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

CREATE POLICY "Published posts are publicly viewable"
ON public.posts
FOR SELECT
TO public
USING (status = 'published'::post_status);

CREATE POLICY "Admins can view all posts"
ON public.posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can insert posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete posts"
ON public.posts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

-- Comments: keep owner deletion and allow admins through direct role lookup.
DROP POLICY IF EXISTS "Users can delete their own comments; admins can delete any" ON public.comments;

CREATE POLICY "Users can delete their own comments; admins can delete any"
ON public.comments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

-- Profiles: admin read access through direct role lookup.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

-- Avoid recursive role-table policy and remove dependency on has_role.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- ================= [ 9 ] 20260525110730_13bebf97-7850-4355-80cd-af500a74dc60.sql =================
-- Only seed admin role if the referenced user actually exists in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT '44c2f3c5-b84d-435c-8565-7b51407d99ac', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '44c2f3c5-b84d-435c-8565-7b51407d99ac')
ON CONFLICT DO NOTHING;

-- ================= [ 10 ] 20260525114004_eb02a374-6059-436f-9716-f9999e53a799.sql =================
UPDATE public.posts SET cover_image = CASE category
  WHEN 'Buddhist Psychology' THEN 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=80'
  WHEN 'Wisdom' THEN 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&q=80'
  WHEN 'Books' THEN 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80'
END
WHERE cover_image IS NULL;

-- ================= [ 11 ] 20260525114556_b7697e91-b88a-46d5-bc2c-802fa5ebfba5.sql =================
-- Tags column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);

-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies for blog-images
DROP POLICY IF EXISTS "Blog images are publicly viewable" ON storage.objects;
CREATE POLICY "Blog images are publicly viewable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Admins can update blog images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- ================= [ 12 ] 20260525120730_09c391ea-1c52-41a2-bf8e-311f6e79c9a2.sql =================
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- ================= [ 13 ] 20260525154009_2776a04b-b020-4373-b72e-22b60b2f2bee.sql =================
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments; admins can update any"
ON public.comments
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role)))
WITH CHECK ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role)));

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================= [ 14 ] 20260525155009_38c867e7-4864-4198-99ae-a109daece2d2.sql =================
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

-- ================= [ 15 ] 20260525161642_466d2f15-65cf-4738-bc83-12bc18128838.sql =================

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


-- ================= [ 16 ] 20260525165052_1a61aad8-d5ee-451a-8e04-d68260dabee6.sql =================

create or replace function public.get_admin_claim_status()
returns table(admin_exists boolean, is_admin boolean, user_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  return query
    select
      exists(select 1 from public.user_roles where role = 'admin') as admin_exists,
      exists(select 1 from public.user_roles where role = 'admin' and user_roles.user_id = uid) as is_admin,
      uid as user_id;
end;
$$;

create or replace function public.claim_admin_role()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  any_admin boolean;
  mine boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select exists(select 1 from public.user_roles where role = 'admin') into any_admin;
  select exists(select 1 from public.user_roles where role = 'admin' and user_id = uid) into mine;

  if any_admin then
    if mine then
      return json_build_object('ok', true, 'alreadyAdmin', true);
    end if;
    raise exception 'An admin has already been assigned. Ask the existing admin to grant you access.';
  end if;

  insert into public.user_roles(user_id, role) values (uid, 'admin');
  return json_build_object('ok', true, 'alreadyAdmin', false);
end;
$$;

grant execute on function public.get_admin_claim_status() to authenticated;
grant execute on function public.claim_admin_role() to authenticated;


-- ================= [ 17 ] 20260526014544_949cf431-23f7-4608-aa6f-0e1cc29a8eb4.sql =================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_image text;

-- Avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for avatars
DO $$ BEGIN
  CREATE POLICY "Avatars are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can upload to avatars bucket
DO $$ BEGIN
  CREATE POLICY "Authenticated can upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can delete avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================= [ 18 ] 20260526022323_8bb5440b-43d6-40ea-96ad-556aa528020f.sql =================

DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;

CREATE POLICY "Admins can upload site assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));


-- ================= [ 19 ] 20260526140145_98017993-407c-48c0-9c42-608c19ab3f2b.sql =================
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;

CREATE POLICY "Admins can upload site assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update site assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
)
WITH CHECK (
  bucket_id = 'site-assets'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete site assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

-- ================= [ 20 ] 20260526142750_4fe8179f-21c2-4f69-92ee-7a249f5beb6b.sql =================

-- user_roles restrictive policies (drop if any exists from prior attempt)
DROP POLICY IF EXISTS "Deny client inserts on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny client updates on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny client deletes on user_roles" ON public.user_roles;

CREATE POLICY "Deny client inserts on user_roles"
  ON public.user_roles FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on user_roles"
  ON public.user_roles FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on user_roles"
  ON public.user_roles FOR DELETE TO authenticated, anon
  USING (false);

-- Avatars storage policies — drop all known prior names, then recreate scoped
DROP POLICY IF EXISTS "Avatars insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatars update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;


-- ================= [ 21 ] 20260528094147_c56228cf-46ba-40cf-8350-f0283ca716b5.sql =================
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete avatars" ON storage.objects;

-- ================= [ 22 ] 20260528095806_84f8110c-825e-46ee-83c0-54d2dc5199b2.sql =================
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete avatars" ON storage.objects;

-- ================= [ 23 ] 20260601024437_9f21679c-1d6c-464b-be6c-b12490d40be3.sql =================
-- Restrict anonymous visitors from reading user_id (auth UUID) from comments,
-- preventing user enumeration. Authenticated users still see user_id so the UI
-- can determine ownership for edit/delete actions.
REVOKE SELECT ON public.comments FROM anon;
GRANT SELECT (id, post_id, parent_id, comment_text, user_name, created_at, updated_at)
  ON public.comments TO anon;

-- ================= [ 24 ] 20260604000001_create_contact_messages.sql =================
-- Applied via Management API on 2026-06-04
-- Table for storing contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can read messages (using the has_role helper created in earlier migrations)
DO $$ BEGIN
  CREATE POLICY "Admins can read contact messages"
    ON public.contact_messages FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anyone can insert (unauthenticated visitors too — this is a public contact form)
DO $$ BEGIN
  CREATE POLICY "Anyone can submit contact messages"
    ON public.contact_messages FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can update (e.g. mark as read)
DO $$ BEGIN
  CREATE POLICY "Admins can update contact messages"
    ON public.contact_messages FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================= [ 25 ] 20260604000002_add_performance_indexes.sql =================
-- Performance indexes for posts and comments queries
-- Created: 2026-06-04

-- Posts: slug is used for individual post lookups (fetchPostBySlug)
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts (slug);

-- Posts: created_at is used for ordering (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- Posts: category is used for filtering (WHERE category = ?)
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts (category);

-- Posts: status is used for filtering published posts (WHERE status = 'published')
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts (status);

-- Composite index for the most common query pattern:
-- WHERE status = 'published' AND category = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_status_category_created_at
  ON public.posts (status, category, created_at DESC);

-- Comments: post_id is used for fetching comments by post (WHERE post_id = ?)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);


-- ================= [ 26 ] 20260604000003_role_based_permissions.sql =================
-- ============================================================================
-- Bodhi Mitra — Role-Based Permissions System
-- ============================================================================
-- Transitions from a hardcoded `app_role` ENUM ('admin'|'user') to a
-- flexible text-based role system with hierarchical levels and granular
-- resource/action permissions.
-- 
-- Strategy: Drop ALL RLS policies first (to eliminate column dependencies),
-- convert the column, then recreate all policies with the new system.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 0. DROP ALL RLS POLICIES (removes all column dependencies)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. DROP DEPENDENT FUNCTIONS AND CONVERT COLUMN TYPE
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_user(UUID) CASCADE;

-- Convert user_roles.role from app_role ENUM → TEXT
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE TEXT
  USING role::text;

-- Drop the old enum (no more dependencies)
DROP TYPE IF EXISTS public.app_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. RECREATE has_role() — now accepts TEXT
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. ROLE HIERARCHY TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.role_hierarchy (
  role TEXT PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT
);

INSERT INTO public.role_hierarchy (role, level, label, description) VALUES
  ('super_admin', 100, 'Super Admin', 'Full system access — can manage users, roles, and all settings'),
  ('admin',       80,  'Admin',       'Can manage posts, comments, media, and site settings'),
  ('editor',      60,  'Editor',      'Can publish, edit, and delete any post; manage comments'),
  ('author',      40,  'Author',      'Can create and edit own posts; comment on any post'),
  ('moderator',   30,  'Moderator',   'Can moderate comments and manage community discussions'),
  ('user',        10,  'User',        'Can comment and engage with published content')
ON CONFLICT (role) DO NOTHING;

ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role hierarchy readable by authenticated"
  ON public.role_hierarchy FOR SELECT
  TO authenticated
  USING (true);

-- Add CHECK constraint on user_roles
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('super_admin', 'admin', 'editor', 'author', 'moderator', 'user'));

-- ════════════════════════════════════════════════════════════════════════════
-- 4. PERMISSION MATRIX TABLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, resource, action)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions readable by authenticated"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed permissions
INSERT INTO public.role_permissions (role, resource, action, allowed) VALUES
  ('super_admin', 'posts',     'create',   true),
  ('super_admin', 'posts',     'edit',     true),
  ('super_admin', 'posts',     'delete',   true),
  ('super_admin', 'posts',     'publish',  true),
  ('super_admin', 'posts',     'view_all', true),
  ('super_admin', 'comments',  'create',   true),
  ('super_admin', 'comments',  'edit',     true),
  ('super_admin', 'comments',  'delete',   true),
  ('super_admin', 'comments',  'moderate', true),
  ('super_admin', 'media',     'upload',   true),
  ('super_admin', 'media',     'delete',   true),
  ('super_admin', 'users',     'view',     true),
  ('super_admin', 'users',     'manage_roles', true),
  ('super_admin', 'settings',  'view',     true),
  ('super_admin', 'settings',  'edit',     true),
  ('admin', 'posts',     'create',   true),
  ('admin', 'posts',     'edit',     true),
  ('admin', 'posts',     'delete',   true),
  ('admin', 'posts',     'publish',  true),
  ('admin', 'posts',     'view_all', true),
  ('admin', 'comments',  'create',   true),
  ('admin', 'comments',  'edit',     true),
  ('admin', 'comments',  'delete',   true),
  ('admin', 'comments',  'moderate', true),
  ('admin', 'media',     'upload',   true),
  ('admin', 'media',     'delete',   true),
  ('admin', 'users',     'view',     true),
  ('admin', 'users',     'manage_roles', false),
  ('admin', 'settings',  'view',     true),
  ('admin', 'settings',  'edit',     true),
  ('editor', 'posts',     'create',   true),
  ('editor', 'posts',     'edit',     true),
  ('editor', 'posts',     'delete',   true),
  ('editor', 'posts',     'publish',  true),
  ('editor', 'posts',     'view_all', true),
  ('editor', 'comments',  'create',   true),
  ('editor', 'comments',  'edit',     true),
  ('editor', 'comments',  'delete',   true),
  ('editor', 'comments',  'moderate', true),
  ('author', 'posts',     'create',   true),
  ('author', 'posts',     'edit',     true),
  ('author', 'posts',     'delete',   false),
  ('author', 'posts',     'publish',  false),
  ('author', 'posts',     'view_all', false),
  ('author', 'comments',  'create',   true),
  ('author', 'comments',  'edit',     true),
  ('author', 'comments',  'delete',   false),
  ('author', 'comments',  'moderate', false),
  ('moderator', 'comments', 'create',   true),
  ('moderator', 'comments', 'edit',     true),
  ('moderator', 'comments', 'delete',   true),
  ('moderator', 'comments', 'moderate', true),
  ('user', 'comments', 'create',   true),
  ('user', 'comments', 'edit',     true),
  ('user', 'comments', 'delete',   false),
  ('user', 'comments', 'moderate', false)
ON CONFLICT (role, resource, action) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min_level INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_hierarchy rh ON ur.role = rh.role
    WHERE ur.user_id = _user_id AND rh.level >= _min_level
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_min_role TO authenticated;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _resource TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.resource = _resource
      AND rp.action = _action
      AND rp.allowed = true
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_roles(_admin_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, display_name TEXT, avatar_url TEXT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.email, p.display_name, p.avatar_url, ur.role, ur.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles admin_ur
    JOIN public.role_hierarchy rh ON admin_ur.role = rh.role
    WHERE admin_ur.user_id = _admin_id AND rh.level >= 80
  )
  ORDER BY ur.created_at DESC NULLS LAST
$$;
GRANT EXECUTE ON FUNCTION public.get_user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_role(_admin_id UUID, _target_user_id UUID, _new_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_level INTEGER;
  target_level INTEGER;
BEGIN
  SELECT rh.level INTO admin_level
  FROM public.user_roles ur
  JOIN public.role_hierarchy rh ON ur.role = rh.role
  WHERE ur.user_id = _admin_id;

  SELECT rh.level INTO target_level
  FROM public.role_hierarchy rh
  WHERE rh.role = _new_role;

  IF admin_level IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'You do not have a valid admin role');
  END IF;
  IF target_level IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid role: ' || _new_role);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _admin_id AND role = 'super_admin') THEN
    IF admin_level <= target_level THEN
      RETURN json_build_object('ok', false, 'error', 'Cannot assign a role equal to or higher than your own');
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_hierarchy rh ON ur.role = rh.role WHERE ur.user_id = _target_user_id AND rh.level >= admin_level) THEN
      RETURN json_build_object('ok', false, 'error', 'Cannot modify a user with the same or higher role');
    END IF;
  END IF;

  -- Delete existing role, then insert new one (avoids duplicate role rows)
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);

  RETURN json_build_object('ok', true, 'role', _new_role);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_role TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. PROMOTE EXISTING ADMINS TO SUPER_ADMIN
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'admin';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. RECREATE ALL RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Profiles insertable by own user"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- posts
CREATE POLICY "Published posts publicly viewable"
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'author'));

CREATE POLICY "Admins can insert posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'author'));

CREATE POLICY "Editors and above can update posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editors and above can delete posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

-- comments
CREATE POLICY "Comments publicly viewable"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Own or admin/moderator can delete comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'moderator'));

-- site_settings
CREATE POLICY "Site settings publicly readable"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- contact_messages
CREATE POLICY "Admins can read contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Storage: post-covers
CREATE POLICY "Cover images publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-covers');

CREATE POLICY "Authors+ can upload cover images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-covers' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'author')));

CREATE POLICY "Admins can update cover images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-covers' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can delete cover images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-covers' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

-- Storage: site-assets
CREATE POLICY "Site assets publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can update site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can delete site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));


-- ================= [ 27 ] 20260604000004_create_audit_log.sql =================
-- Create audit_log table for tracking admin actions (role changes, user deletions, invitations)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient querying (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);

-- Index for filtering by actor
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log (actor_id);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);

-- Enable RLS but only allow inserts via the server-side function
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read the audit log
CREATE POLICY "super_admin_read_audit_log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- No direct insert/update/delete from client — all inserts happen server-side via service_role

-- Grant usage to authenticated users for SELECT only
GRANT SELECT ON public.audit_log TO authenticated;


-- ================= [ 28 ] 20260605000001_create_media_assets.sql =================
-- ============================================================================
-- Bodhi Mitra — Media Assets Library
-- ============================================================================
-- Centralized media management table. All uploaded assets (images, PDFs, etc.)
-- are tracked here regardless of which storage bucket they live in.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  bucket TEXT NOT NULL DEFAULT 'blog-images',
  alt_text TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search vector for filename search
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(filename, ''))) STORED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_bucket ON public.media_assets (bucket);
CREATE INDEX IF NOT EXISTS idx_media_assets_mime_type ON public.media_assets (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON public.media_assets (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_assets_search ON public.media_assets USING GIN (search_vector);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Publicly readable (for displayed images)
CREATE POLICY "Media assets publicly readable"
  ON public.media_assets FOR SELECT
  USING (true);

-- Authenticated users can insert their own uploads
CREATE POLICY "Authenticated can insert media assets"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

-- Admins can update any asset
CREATE POLICY "Admins can update media assets"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Admins can delete assets
CREATE POLICY "Admins can delete media assets"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_media_assets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_assets_timestamp();


-- ================= [ 29 ] 20260605000002_create_pages.sql =================
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


-- ================= [ 30 ] 20260605000003_create_books.sql =================
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


-- ================= [ 31 ] 20260605000004_create_taxonomy.sql =================
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


-- ================= [ 32 ] 20260605000005_create_book_covers_bucket.sql =================
-- ============================================================================
-- Bodhi Mitra — Create book-covers storage bucket and RLS policies
-- ============================================================================
-- Creates the storage bucket for book covers and PDF files, with proper
-- RLS policies matching the existing pattern from post-covers/site-assets.
-- ============================================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  52428800, -- 50 MB (PDFs can be large)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for book-covers

CREATE POLICY "Book-covers publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Editors+ can upload book-covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'book-covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Admins can update book-covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'book-covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can delete book-covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'book-covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );


-- ================= [ 33 ] 20260605000006_add_blog_images_storage_rls.sql =================
-- ============================================================================
-- Bodhi Mitra — Storage RLS policies for blog-images bucket
-- ============================================================================
-- The blog-images bucket was created earlier but didn't have storage-level RLS
-- policies. Adding them now for consistency with other buckets.
-- ============================================================================

-- Storage RLS policies for blog-images

CREATE POLICY "Blog-images publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated can upload blog-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Admins can update blog-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can delete blog-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );


-- ================= [ 34 ] 20260605000007_create_navigation_items.sql =================
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


-- ================= [ 35 ] 20260605000008_add_storage_provider_to_media_assets.sql =================
-- ============================================================================
-- Bodhi Mitra — Add storage_provider column to media_assets
-- ============================================================================
-- Replaces heuristic R2-vs-Supabase detection (.r2.dev URL checks) with a
-- deterministic column. Every uploaded file records which storage backend
-- it lives in.
-- ============================================================================

ALTER TABLE public.media_assets
  ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'supabase';

-- All existing rows were uploaded via Supabase Storage, so the default is correct.
-- Going forward, new uploads will explicitly set 'r2' or 'supabase'.

COMMENT ON COLUMN public.media_assets.storage_provider IS
  'Storage backend: ''supabase'' or ''r2''. Used to determine which API to call for deletions and other storage operations.';

-- Index to quickly filter by storage backend
CREATE INDEX IF NOT EXISTS idx_media_assets_storage_provider
  ON public.media_assets (storage_provider);


-- ================= [ 36 ] 20260605000009_drop_storage_provider_from_media_assets.sql =================
-- Revert: storage_provider column is no longer needed (R2 removed, Supabase-only)
ALTER TABLE media_assets DROP COLUMN IF EXISTS storage_provider;

-- Drop the index added in the previous migration
DROP INDEX IF EXISTS idx_media_assets_storage_provider;

COMMENT ON COLUMN media_assets.storage_provider IS NULL;


-- ================= [ 37 ] 20260605000010_create_videos.sql =================
-- ============================================================================
-- Bodhi Mitra — Video Section (YouTube-integrated content module)
-- ============================================================================
-- Each video entry stores metadata only: title, description, thumbnail image URL,
-- and the YouTube URL. No video file storage — YouTube is the source of truth.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  youtube_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos (status);
CREATE INDEX IF NOT EXISTS idx_videos_sort_order ON public.videos (sort_order);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos (created_at DESC);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Publicly readable (published only; admins/editors can see all)
CREATE POLICY "Published videos publicly readable"
  ON public.videos FOR SELECT
  USING (
    status = 'published' OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'author')
  );

-- Editors and above can insert
CREATE POLICY "Editors and above can insert videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'author')
  );

-- Editors and above can update
CREATE POLICY "Editors and above can update videos"
  ON public.videos FOR UPDATE
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
CREATE POLICY "Editors and above can delete videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'editor')
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_videos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_videos_updated_at ON public.videos;
CREATE TRIGGER trg_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_videos_timestamp();


-- ================= [ 38 ] 20260605000011_add_page_sections.sql =================
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


-- ================= [ 39 ] 20260605000012_add_nav_location.sql =================
-- ============================================================================
-- Bodhi Mitra — Navigation Location Support
-- ============================================================================
-- Adds a `location` column to navigation_items for separating header
-- and footer menus. Default is 'header' for backward compatibility.
-- ============================================================================

-- Add location column
ALTER TABLE public.navigation_items ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'header'
  CHECK (location IN ('header', 'footer'));

-- Update seed data: mark existing items as header
UPDATE public.navigation_items SET location = 'header' WHERE location = 'header';

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_nav_items_location ON public.navigation_items (location);


-- ================= [ 40 ] 20260607000001_extend_books_module.sql =================
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


-- ================= [ 41 ] 20260710000001_create_newsletter_subscribers.sql =================
-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Only admins can read subscribers
DO $$ BEGIN
  CREATE POLICY "Admins can read newsletter subscribers"
    ON public.newsletter_subscribers FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anyone can insert (public subscription form)
DO $$ BEGIN
  CREATE POLICY "Anyone can subscribe to newsletter"
    ON public.newsletter_subscribers FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can update (e.g. mark as unsubscribed)
DO $$ BEGIN
  CREATE POLICY "Admins can update newsletter subscribers"
    ON public.newsletter_subscribers FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================= [ 42 ] 20260710000002_create_bookmarks.sql =================
-- Bookmarks table for user-post bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookmarks
DO $$ BEGIN
  CREATE POLICY "Users can read own bookmarks"
    ON public.bookmarks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own bookmarks
DO $$ BEGIN
  CREATE POLICY "Users can insert own bookmarks"
    ON public.bookmarks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own bookmarks
DO $$ BEGIN
  CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================= [ 43 ] 20260711000001_create_courses.sql =================
-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL DEFAULT '',
  title_bn TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_bn TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  category TEXT,
  level TEXT DEFAULT 'beginner',
  duration_weeks INTEGER DEFAULT 4,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published courses"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Course lessons table
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  title_bn TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  content_bn TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, slug)
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published course lessons"
  ON public.course_lessons FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses WHERE id = course_id AND published = true
  ));

CREATE POLICY "Admins can manage course lessons"
  ON public.course_lessons FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lesson progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lesson progress"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own lesson progress"
  ON public.lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own lesson progress"
  ON public.lesson_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ================= [ 44 ] 20260711000002_create_carts.sql =================
-- Carts table (one cart per user)
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Users can read their own cart
DO $$ BEGIN
  CREATE POLICY "Users can read own cart"
    ON public.carts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own cart
DO $$ BEGIN
  CREATE POLICY "Users can insert own cart"
    ON public.carts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own cart
DO $$ BEGIN
  CREATE POLICY "Users can update own cart"
    ON public.carts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own cart
DO $$ BEGIN
  CREATE POLICY "Users can delete own cart"
    ON public.carts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cart items table (books in the cart)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cart_id, book_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own cart items (via their cart)
DO $$ BEGIN
  CREATE POLICY "Users can read own cart items"
    ON public.cart_items FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert items into their own cart
DO $$ BEGIN
  CREATE POLICY "Users can insert own cart items"
    ON public.cart_items FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete items from their own cart
DO $$ BEGIN
  CREATE POLICY "Users can delete own cart items"
    ON public.cart_items FOR DELETE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================= [ 45 ] 20260711000003_extend_bookmarks_polymorphic.sql =================
-- Extend bookmarks table to support polymorphic resources (posts + books + future)
-- Replaces the post_id-only constraint with resource_id + resource_type pattern.

-- 1. Add polymorphic columns (nullable initially for backfill)
ALTER TABLE public.bookmarks
  ADD COLUMN resource_id UUID,
  ADD COLUMN resource_type VARCHAR(50);

-- 2. Backfill existing post bookmarks
UPDATE public.bookmarks
SET resource_id = post_id, resource_type = 'post'
WHERE post_id IS NOT NULL;

-- 3. Set NOT NULL after backfill
ALTER TABLE public.bookmarks
  ALTER COLUMN resource_id SET NOT NULL,
  ALTER COLUMN resource_type SET NOT NULL;

-- 4. Drop old post_id column
ALTER TABLE public.bookmarks DROP COLUMN post_id;

-- 5. Drop old unique constraint
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_post_id_key;

-- 6. Add new composite unique constraint
ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_resource_key UNIQUE (user_id, resource_id, resource_type);

-- 7. Add index for efficient lookups by resource
CREATE INDEX IF NOT EXISTS idx_bookmarks_resource
  ON public.bookmarks (resource_id, resource_type);

-- 8. Update RLS policies (they use auth.uid() which remains valid)
-- The existing SELECT/INSERT/DELETE policies still work since they only check user_id.


-- ================= [ 46 ] 20260711000004_create_reader_tables.sql =================
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


-- ================= [ 47 ] 20260712000001_create_content_sections.sql =================
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create content sections table for AI RAG
-- Stores chunked content from books, posts, courses, and videos as vector embeddings
CREATE TABLE IF NOT EXISTS public.content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'post', 'course', 'video', 'podcast')),
  content_id UUID NOT NULL,
  section_index INTEGER NOT NULL,
  heading TEXT DEFAULT '',
  body_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster content lookup by type and ID
CREATE INDEX IF NOT EXISTS idx_content_sections_content
  ON public.content_sections (content_type, content_id);

-- IVFFlat index for vector similarity search (create after ~1,000 rows)
CREATE INDEX IF NOT EXISTS idx_content_sections_embedding
  ON public.content_sections
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for updated_at ordering
CREATE INDEX IF NOT EXISTS idx_content_sections_updated_at
  ON public.content_sections (updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;

-- Everyone can read published content sections
CREATE POLICY "Anyone can read content sections"
  ON public.content_sections FOR SELECT
  USING (true);

-- Only service role (server-side) can insert/update/delete
CREATE POLICY "Service role manages content sections"
  ON public.content_sections FOR ALL
  USING (auth.role() = 'service_role');

-- Create match_content_sections function for cosine similarity search
CREATE OR REPLACE FUNCTION public.match_content_sections(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_content_type TEXT DEFAULT NULL,
  filter_content_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  section_index INTEGER,
  heading TEXT,
  body_text TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.content_type,
    cs.content_id,
    cs.section_index,
    cs.heading,
    cs.body_text,
    1 - (cs.embedding <=> query_embedding) AS similarity,
    cs.metadata,
    cs.created_at
  FROM public.content_sections cs
  WHERE
    cs.embedding IS NOT NULL
    AND 1 - (cs.embedding <=> query_embedding) > match_threshold
    AND (filter_content_type IS NULL OR cs.content_type = filter_content_type)
    AND (filter_content_id IS NULL OR cs.content_id = filter_content_id)
  ORDER BY cs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_content_sections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_content_sections_updated_at
  BEFORE UPDATE ON public.content_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_sections_updated_at();


-- ================= [ 48 ] 20260712000001_create_login_history.sql =================
-- Create login_history table for tracking user sign-ins
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  sign_in_method TEXT DEFAULT 'email' CHECK (sign_in_method IN ('email', 'google', 'invite', 'magic_link')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient querying by user (most recent first)
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history (user_id, created_at DESC);

-- Index for admin queries across all users
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history (created_at DESC);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Server-side insert only (via service_role)
-- No direct INSERT/UPDATE/DELETE from client

GRANT SELECT ON public.login_history TO authenticated;


-- ================= [ 49 ] 20260712000002_add_user_preferences.sql =================
-- Add preferences column to profiles for per-user settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;


-- ================= [ 50 ] 20260713000001_create_content_modeling.sql =================
-- ============================================================================
-- Content Modeling Schema — Self-contained (no external dependencies)
-- ============================================================================

-- 1. Ensure app_role enum exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Ensure has_role function exists
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- 4. content_type_definitions
CREATE TABLE IF NOT EXISTS public.content_type_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  label_plural TEXT,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'FileText',
  content_type TEXT NOT NULL DEFAULT 'collection' CHECK (content_type IN ('collection', 'singleton')),
  workflow_enabled BOOLEAN NOT NULL DEFAULT false,
  workflow_statuses JSONB DEFAULT '["draft", "published"]',
  workflow_default_status TEXT DEFAULT 'draft',
  workflow_transitions JSONB DEFAULT '{"draft": ["published"], "published": ["draft"]}',
  has_slug BOOLEAN NOT NULL DEFAULT true,
  has_seo BOOLEAN NOT NULL DEFAULT false,
  has_tags BOOLEAN NOT NULL DEFAULT false,
  has_revisions BOOLEAN NOT NULL DEFAULT false,
  has_categories BOOLEAN NOT NULL DEFAULT false,
  has_authors BOOLEAN NOT NULL DEFAULT false,
  has_sort_order BOOLEAN NOT NULL DEFAULT false,
  has_rich_content BOOLEAN NOT NULL DEFAULT false,
  can_duplicate BOOLEAN NOT NULL DEFAULT true,
  can_archive BOOLEAN NOT NULL DEFAULT true,
  can_schedule BOOLEAN NOT NULL DEFAULT false,
  preview_url TEXT DEFAULT '',
  api_endpoint TEXT GENERATED ALWAYS AS (slug) STORED,
  custom_table TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. content_type_fields
CREATE TABLE IF NOT EXISTS public.content_type_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID NOT NULL REFERENCES public.content_type_definitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  label_bn TEXT DEFAULT '',
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'richtext', 'number', 'boolean', 'date', 'time',
    'datetime', 'select', 'multi_select', 'color', 'icon', 'media', 'file',
    'url', 'email', 'json', 'code', 'relation', 'group', 'repeater', 'block', 'tab'
  )),
  required BOOLEAN NOT NULL DEFAULT false,
  unique_field BOOLEAN NOT NULL DEFAULT false,
  validation_rules JSONB DEFAULT '{}',
  field_options JSONB DEFAULT '{}',
  placeholder TEXT DEFAULT '',
  placeholder_bn TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_bn TEXT DEFAULT '',
  default_value JSONB DEFAULT 'null',
  group_name TEXT DEFAULT '',
  tab_name TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  column_span INTEGER NOT NULL DEFAULT 1 CHECK (column_span IN (1, 2, 3)),
  show_if JSONB DEFAULT '{}',
  system_field BOOLEAN NOT NULL DEFAULT false,
  seo_field BOOLEAN NOT NULL DEFAULT false,
  sub_fields JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_type_id, name)
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_content_type_fields_sort ON public.content_type_fields (content_type_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_content_type_definitions_slug ON public.content_type_definitions (slug);
CREATE INDEX IF NOT EXISTS idx_content_type_definitions_type ON public.content_type_definitions (content_type);

-- 7. RLS
ALTER TABLE public.content_type_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_type_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Admins can manage content type definitions" ON public.content_type_definitions;
DROP POLICY IF EXISTS "Authenticated users can read content type definitions" ON public.content_type_definitions;
DROP POLICY IF EXISTS "Public can read content type definitions" ON public.content_type_definitions;
DROP POLICY IF EXISTS "Admins can manage content type fields" ON public.content_type_fields;
DROP POLICY IF EXISTS "Authenticated users can read content type fields" ON public.content_type_fields;
DROP POLICY IF EXISTS "Public can read content type fields" ON public.content_type_fields;

CREATE POLICY "Admins can manage content type definitions"
  ON public.content_type_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read content type definitions"
  ON public.content_type_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read content type definitions"
  ON public.content_type_definitions FOR SELECT TO anon USING (true);

CREATE POLICY "Admins can manage content type fields"
  ON public.content_type_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read content type fields"
  ON public.content_type_fields FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read content type fields"
  ON public.content_type_fields FOR SELECT TO anon USING (true);

-- 8. Helper functions
CREATE OR REPLACE FUNCTION public.get_content_type_by_slug(type_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'definition', to_jsonb(ctd.*),
    'fields', jsonb_agg(to_jsonb(ctf.*) ORDER BY ctf.sort_order ASC)
  )
  FROM public.content_type_definitions ctd
  LEFT JOIN public.content_type_fields ctf ON ctf.content_type_id = ctd.id
  WHERE ctd.slug = type_slug
  GROUP BY ctd.id;
$$;

CREATE OR REPLACE FUNCTION public.get_collection_types()
RETURNS SETOF public.content_type_definitions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT * FROM public.content_type_definitions WHERE content_type = 'collection' ORDER BY label ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_singleton_types()
RETURNS SETOF public.content_type_definitions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT * FROM public.content_type_definitions WHERE content_type = 'singleton' ORDER BY label ASC;
$$;

-- 9. Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_content_modeling_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop existing triggers if any (idempotent)
DROP TRIGGER IF EXISTS update_content_type_definitions_timestamp ON public.content_type_definitions;
DROP TRIGGER IF EXISTS update_content_type_fields_timestamp ON public.content_type_fields;

CREATE TRIGGER update_content_type_definitions_timestamp
  BEFORE UPDATE ON public.content_type_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_content_modeling_timestamp();

CREATE TRIGGER update_content_type_fields_timestamp
  BEFORE UPDATE ON public.content_type_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_content_modeling_timestamp();

-- 10. dynamic_content_items
CREATE TABLE IF NOT EXISTS public.dynamic_content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID NOT NULL REFERENCES public.content_type_definitions(id) ON DELETE CASCADE,
  content_data JSONB NOT NULL DEFAULT '{}',
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dynamic_content_type_id ON public.dynamic_content_items (content_type_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_status ON public.dynamic_content_items (status);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_slug ON public.dynamic_content_items (slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_created ON public.dynamic_content_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_scheduled ON public.dynamic_content_items (scheduled_at) WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.dynamic_content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage dynamic content" ON public.dynamic_content_items;
DROP POLICY IF EXISTS "Users can read published dynamic content" ON public.dynamic_content_items;
DROP POLICY IF EXISTS "Public can read published dynamic content" ON public.dynamic_content_items;

CREATE POLICY "Admins can manage dynamic content"
  ON public.dynamic_content_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read published dynamic content"
  ON public.dynamic_content_items FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "Public can read published dynamic content"
  ON public.dynamic_content_items FOR SELECT TO anon USING (status = 'published');

DROP TRIGGER IF EXISTS update_dynamic_content_timestamp ON public.dynamic_content_items;
CREATE TRIGGER update_dynamic_content_timestamp
  BEFORE UPDATE ON public.dynamic_content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_content_modeling_timestamp();


-- ================= [ 51 ] 20260713000001_create_dam_tables.sql =================
-- ============================================================================
-- Bodhi Mitra — Phase 05: Digital Asset Management (DAM) System
-- ============================================================================
-- Adds folder organization, tagging, favorites, version history, and usage
-- tracking for the centralized media library.
-- ============================================================================

-- ============================================================================
-- 1. Media Folders (hierarchical organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'blog-images',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON public.media_folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_bucket ON public.media_folders (bucket);

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media folders publicly readable"
  ON public.media_folders FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert folders"
  ON public.media_folders FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update folders"
  ON public.media_folders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete folders"
  ON public.media_folders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- 2. Folder path trigger (auto-generate breadcrumb path)
-- ============================================================================

ALTER TABLE public.media_folders ADD COLUMN IF NOT EXISTS path TEXT;
CREATE INDEX IF NOT EXISTS idx_media_folders_path ON public.media_folders (path);

-- ============================================================================
-- 3. Extend media_assets with DAM columns
-- ============================================================================

ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.media_folders(id) ON DELETE SET NULL;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS duration NUMERIC; -- for audio/video (seconds)
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS checksum TEXT; -- for deduplication
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS original_filename TEXT; -- original name before any rename

CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.media_assets (folder_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_is_private ON public.media_assets (is_private);
CREATE INDEX IF NOT EXISTS idx_media_assets_checksum ON public.media_assets (checksum);

-- ============================================================================
-- 4. Media Asset Tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_tags_slug ON public.media_tags (slug);

ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media tags publicly readable"
  ON public.media_tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.media_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Junction table
CREATE TABLE IF NOT EXISTS public.media_asset_tags (
  asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.media_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_media_asset_tags_asset ON public.media_asset_tags (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_tags_tag ON public.media_asset_tags (tag_id);

ALTER TABLE public.media_asset_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media asset tags publicly readable"
  ON public.media_asset_tags FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage asset tags"
  ON public.media_asset_tags FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. Media Favorites (per-user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_media_favorites_user ON public.media_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_media_favorites_asset ON public.media_favorites (asset_id);

ALTER TABLE public.media_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON public.media_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. Media Asset Versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_versions_asset ON public.media_asset_versions (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_versions_number ON public.media_asset_versions (asset_id, version_number DESC);

ALTER TABLE public.media_asset_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media versions publicly readable"
  ON public.media_asset_versions FOR SELECT USING (true);

CREATE POLICY "Admins can insert versions"
  ON public.media_asset_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- 7. Media Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'post', 'page', 'book', 'product', 'form', etc.
  resource_id UUID NOT NULL,
  field_name TEXT, -- which field uses this asset (e.g., 'cover_image', 'content')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, resource_type, resource_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_media_usage_asset ON public.media_usage (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_usage_resource ON public.media_usage (resource_type, resource_id);

ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media usage publicly readable"
  ON public.media_usage FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert usage"
  ON public.media_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete usage"
  ON public.media_usage FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 8. New Storage Buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('audio', 'audio', true, 52428800, '{audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/flac,audio/mp4}'),
  ('documents', 'documents', true, 104857600, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet}'),
  ('videos', 'videos', true, 536870912, '{video/mp4,video/webm,video/ogg,video/quicktime}'),
  ('fonts', 'fonts', true, 10485760, '{font/ttf,font/otf,font/woff,font/woff2}'),
  ('icons', 'icons', true, 10485760, '{image/svg+xml,image/png,image/x-icon}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. Storage RLS Policies
-- ============================================================================

-- Public buckets (anyone can read)
CREATE POLICY "Public storage read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('blog-images', 'site-assets', 'book-covers', 'avatars', 'audio', 'documents', 'videos', 'fonts', 'icons'));

-- Authenticated users can upload to any public bucket
CREATE POLICY "Authenticated storage insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('blog-images', 'site-assets', 'book-covers', 'avatars', 'audio', 'documents', 'videos', 'fonts', 'icons'));

-- Admins can update/delete
CREATE POLICY "Admin storage update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Admin storage delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- ============================================================================
-- 10. Version tracking trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_media_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.media_asset_versions (
    asset_id, url, path, filename, file_size, mime_type,
    width, height, version_number, change_note, created_by
  )
  VALUES (
    NEW.id, NEW.url, NEW.path, NEW.filename, NEW.file_size, NEW.mime_type,
    NEW.width, NEW.height,
    (SELECT COALESCE(MAX(version_number), 0) + 1 FROM public.media_asset_versions WHERE asset_id = NEW.id),
    'Initial upload',
    NEW.uploaded_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_media_create_version ON public.media_assets;
CREATE TRIGGER trg_media_create_version
  AFTER INSERT ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_media_version();


-- ================= [ 52 ] 20260713000002_create_content_collections.sql =================
-- Create content_collections for grouping content types
-- Phase 03: CMS Engine & Content Modeling — Organization & Validation

-- ============================================================================
-- Table: content_collections
-- Logical groupings for content types (e.g., "Blog", "Learning", "Resources")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT '#6b7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_collections_sort ON public.content_collections (sort_order ASC);

ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;

-- Only admins can manage collections
CREATE POLICY "Admins can manage collections"
  ON public.content_collections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Everyone can read collections
CREATE POLICY "Everyone can read collections"
  ON public.content_collections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read collections"
  ON public.content_collections
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Add collection_id to content_type_definitions
-- ============================================================================
ALTER TABLE public.content_type_definitions
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.content_collections(id) ON DELETE SET NULL;

CREATE INDEX idx_content_type_definitions_collection
  ON public.content_type_definitions (collection_id);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================
CREATE TRIGGER update_content_collections_timestamp
  BEFORE UPDATE ON public.content_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();

-- ============================================================================
-- Seed default collections
-- ============================================================================
INSERT INTO public.content_collections (name, slug, label, description, icon, color, sort_order) VALUES
  ('content', 'content', 'Content', 'Standard content types like posts and pages', 'FileText', '#3b82f6', 1),
  ('learning', 'learning', 'Learning', 'Educational content like courses and books', 'BookOpen', '#10b981', 2),
  ('media', 'media', 'Media', 'Media content like videos and podcasts', 'Video', '#f59e0b', 3),
  ('commerce', 'commerce', 'Commerce', 'Commerce content like products', 'ShoppingBag', '#ef4444', 4),
  ('community', 'community', 'Community', 'Community content like discussions', 'MessageSquare', '#8b5cf6', 5)
ON CONFLICT (name) DO NOTHING;


-- ================= [ 53 ] 20260714000001_create_redirects.sql =================
-- ============================================================================
-- Redirects Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT DEFAULT '',
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_redirects_from_path ON public.redirects (from_path);
CREATE INDEX idx_redirects_active ON public.redirects (is_active) WHERE is_active = true;

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage redirects" ON public.redirects;
DROP POLICY IF EXISTS "Public can read active redirects" ON public.redirects;

CREATE POLICY "Admins can manage redirects"
  ON public.redirects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active redirects"
  ON public.redirects FOR SELECT TO anon
  USING (is_active = true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_redirects_timestamp ON public.redirects;
CREATE TRIGGER update_redirects_timestamp
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();


-- ================= [ 54 ] 20260714000002_create_coupons.sql =================
-- ============================================================================
-- Coupons System
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10, 2) NOT NULL,
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_purchase_amount NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON public.coupons (code);
CREATE INDEX idx_coupons_active ON public.coupons (is_active) WHERE is_active = true;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active coupons"
  ON public.coupons FOR SELECT TO anon
  USING (is_active = true);

DROP TRIGGER IF EXISTS update_coupons_timestamp ON public.coupons;
CREATE TRIGGER update_coupons_timestamp
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();


-- ================= [ 55 ] 20260714000003_add_newsletter_unsubscribe_token.sql =================
-- Add unsubscribe token for secure token-based unsubscribing
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_token
  ON public.newsletter_subscribers (unsubscribe_token)
  WHERE active = true;

-- Add DELETE RLS policy for admins
DROP POLICY IF EXISTS "Admins can delete newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can delete newsletter subscribers"
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ================= [ 56 ] 20260714000004_create_admin_notifications.sql =================
-- Create admin notifications table for persistent notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('new_comment', 'comment_reply', 'contact_message', 'new_purchase')),
  message TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can read notifications
DROP POLICY IF EXISTS "Admins can read notifications" ON public.admin_notifications;
CREATE POLICY "Admins can read notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert notifications (server-side)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.admin_notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update (mark read)
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete notifications
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.admin_notifications;
CREATE POLICY "Admins can delete notifications"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ================= [ 57 ] 20260714000007_add_full_text_search.sql =================
-- ============================================================================
-- Full-Text Search Indexes
-- ============================================================================

-- Enable pg_trgm extension for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Posts: tsvector on title + excerpt
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(excerpt_en, '') || ' ' ||
      coalesce(excerpt_bn, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search ON public.posts USING GIN (search_vector);

-- Pages: tsvector on title + header
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(header_en, '') || ' ' ||
      coalesce(header_bn, '') || ' ' ||
      coalesce(meta_description_en, '') || ' ' ||
      coalesce(meta_description_bn, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_pages_search ON public.pages USING GIN (search_vector);

-- Books: tsvector on title + description + author + category
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(description_en, '') || ' ' ||
      coalesce(description_bn, '') || ' ' ||
      coalesce(author_name, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_books_search ON public.books USING GIN (search_vector);

-- Videos: tsvector on title + description (videos table uses singular column names)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_videos_search ON public.videos USING GIN (search_vector);

-- Courses: tsvector on title + description
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_en, '') || ' ' ||
      coalesce(title_bn, '') || ' ' ||
      coalesce(description_en, '') || ' ' ||
      coalesce(description_bn, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_courses_search ON public.courses USING GIN (search_vector);

-- Search analytics table
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_result_id TEXT,
  clicked_result_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics (query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON public.search_analytics (created_at DESC);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can read search analytics
DROP POLICY IF EXISTS "Admins can read search analytics" ON public.search_analytics;
CREATE POLICY "Admins can read search analytics"
  ON public.search_analytics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert search analytics
DROP POLICY IF EXISTS "Anyone can insert search analytics" ON public.search_analytics;
CREATE POLICY "Anyone can insert search analytics"
  ON public.search_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert search analytics" ON public.search_analytics;
CREATE POLICY "Authenticated can insert search analytics"
  ON public.search_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ================= [ 58 ] 20260714000008_add_content_view_counts.sql =================
-- Add view counts to content tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Indexes for trending queries
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON public.posts (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_books_view_count ON public.books (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_courses_view_count ON public.courses (view_count DESC);


-- ================= [ 59 ] 20260714000009_create_content_revisions.sql =================
-- ============================================================================
-- Content Revisions System
-- ============================================================================

-- Revisions table
CREATE TABLE IF NOT EXISTS public.content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  changes TEXT[] DEFAULT '{}',
  summary TEXT DEFAULT '',
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_revisions_content
  ON public.content_revisions (content_type, content_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_revisions_changed_by
  ON public.content_revisions (changed_by);

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

-- Admins can manage revisions
DROP POLICY IF EXISTS "Admins can manage revisions" ON public.content_revisions;
CREATE POLICY "Admins can manage revisions"
  ON public.content_revisions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read revisions
DROP POLICY IF EXISTS "Authenticated can read revisions" ON public.content_revisions;
CREATE POLICY "Authenticated can read revisions"
  ON public.content_revisions FOR SELECT
  TO authenticated
  USING (true);

-- Content audit log
CREATE TABLE IF NOT EXISTS public.content_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_audit_log_content
  ON public.content_audit_log (content_type, content_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_audit_log_actor
  ON public.content_audit_log (actor_id);

ALTER TABLE public.content_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can manage content audit log
DROP POLICY IF EXISTS "Admins can manage content audit log" ON public.content_audit_log;
CREATE POLICY "Admins can manage content audit log"
  ON public.content_audit_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Comment moderation: add status column
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected', 'spam'));

CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments (status);


-- ================= [ 60 ] 20260810000001_create_avatars_bucket.sql =================

-- ============================================================================
-- Sabbe Satta — Create avatars storage bucket and RLS policies
-- ============================================================================
-- Holds user profile avatar images (Settings → Profile & Account → avatar
-- upload). Each user may upload/update/delete only files under their own
-- avatars/{user_id}/ folder; avatars are public so the header + settings
-- pages can render them directly.
-- ============================================================================

-- Create the bucket if it doesn't exist (2 MB matches the frontend limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for avatars

CREATE POLICY "Avatars publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );


-- ================= [ 61 ] 20260815000001_unified_schema_delta.sql =================

-- ============================================================================
-- Sabbe Satta — P1 Unified Schema Delta (AD-029)
-- ============================================================================
-- Adds the tables/columns/buckets required by the approved unified architecture
-- that were missing from the existing 60 migrations:
--
--   1. `orders` + `order_items`  — server-side payment order state machine
--      (AD-026 provider-agnostic flow). The frontend order service
--      (src/lib/payments/orders.ts) is mock-first until these land (P3/P4).
--   2. Book amendments — `author_bio_en/bn`, `chapters`, `chapter_pages`
--      columns on `books` (present in the frontend `Book` interface + reader
--      TOC but never migrated).
--   3. `book_grid_settings`     — admin/site-settings layer (P6 grid density
--      per breakpoint for ALL content grids).
--   4. `covers` storage bucket  — the target bucket set (book-pdfs private,
--      covers, avatars, site-assets, documents); covers is the one bucket not
--      created by the existing migrations.
--
-- Idempotent (safe to run on any instance). Uses the project's existing
-- conventions: has_role()/update_updated_at_column(), RLS on every table,
-- policy names matching the existing style.
-- ============================================================================

-- ─── 1. Orders + order_items ────────────────────────────────────────────────

-- Server-side payment order. Created `pending` BEFORE the payer reaches a
-- gateway; the webhook (or simulated completion) transitions it to
-- paid/failed/cancelled. Idempotent transitions guard duplicate callbacks.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  -- Provider that initiated this order ("simulated" | "piprapay").
  provider TEXT NOT NULL DEFAULT 'simulated'
    CHECK (provider IN ('simulated', 'piprapay')),
  -- Provider-side reference (e.g. PipraPay TrxID) once known.
  gateway_reference TEXT,
  -- Coupon applied (for redemption incrementing); NULL when none.
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders.
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Orders are created server-side only (never by the client directly).
CREATE POLICY "Orders created server-side only"
  ON public.orders FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Orders updated server-side only"
  ON public.orders FOR UPDATE
  USING (false);

-- One purchasable line inside an order (mirrors PaymentOrderItem).
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  -- Snapshot fields so receipts survive book edits/deletes.
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  title_en TEXT,
  title_bn TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_book_id ON public.order_items (book_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_items_order_book
  ON public.order_items (order_id, book_id) WHERE book_id IS NOT NULL;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Items are readable only through the owning user's order.
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Order items created server-side only"
  ON public.order_items FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Order items updated server-side only"
  ON public.order_items FOR UPDATE
  USING (false);

-- ─── 2. Book amendments (author bio + chapters) ─────────────────────────────

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS author_bio_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS author_bio_bn TEXT NOT NULL DEFAULT '',
  -- Chapter titles for the TOC preview; parallel array of starting pages.
  ADD COLUMN IF NOT EXISTS chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chapter_pages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── 3. Book grid settings (admin/site-settings layer, P6) ──────────────────

-- Per-breakpoint grid density for ALL content grids (books, reflections,
-- videos, homepage sections), driven via CSS custom properties
-- (--book-grid-cols-mobile/tablet/desktop pattern). Singleton row (key='default').
CREATE TABLE IF NOT EXISTS public.book_grid_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_book_grid_settings_updated_at
  BEFORE UPDATE ON public.book_grid_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.book_grid_settings ENABLE ROW LEVEL SECURITY;

-- Publicly readable (drives the public site layout).
CREATE POLICY "Book grid settings publicly readable"
  ON public.book_grid_settings FOR SELECT
  USING (true);

-- Writes are server-side (Refine admin via server functions, P2).
CREATE POLICY "Book grid settings written server-side only"
  ON public.book_grid_settings FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Book grid settings updated server-side only"
  ON public.book_grid_settings FOR UPDATE
  USING (false);

-- ─── 4. covers storage bucket (target bucket set) ───────────────────────────

-- General-purpose cover images (book/post/video covers). Public for direct
-- rendering; writes restricted to editors+ (matches book-covers pattern).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  20971520, -- 20 MB (cover images; PDFs live in private book-pdfs)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Covers publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Editors+ can upload covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Editors+ can update covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Editors+ can delete covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );
