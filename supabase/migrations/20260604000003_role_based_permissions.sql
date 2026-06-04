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
