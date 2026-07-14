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
