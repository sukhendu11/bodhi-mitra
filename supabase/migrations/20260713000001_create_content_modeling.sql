-- Create content_modeling schema for dynamic content types
-- Phase 03: CMS Engine & Content Modeling

-- ============================================================================
-- Table: content_type_definitions
-- Stores the metadata for each dynamic content type (collections & singletons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_type_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  label_plural TEXT,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'FileText',
  -- Type: 'collection' (multiple items) or 'singleton' (single item)
  content_type TEXT NOT NULL DEFAULT 'collection' CHECK (content_type IN ('collection', 'singleton')),
  -- Workflow configuration
  workflow_enabled BOOLEAN NOT NULL DEFAULT false,
  workflow_statuses JSONB DEFAULT '["draft", "published"]',
  workflow_default_status TEXT DEFAULT 'draft',
  workflow_transitions JSONB DEFAULT '{"draft": ["published"], "published": ["draft"]}',
  -- Feature flags
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
  -- Preview configuration
  preview_url TEXT DEFAULT '',
  -- API configuration
  api_endpoint TEXT GENERATED ALWAYS AS (slug) STORED,
  -- Database: if using a dedicated table (for custom SQL-backed types)
  custom_table TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table: content_type_fields
-- Stores the field definitions for each content type
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_type_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID NOT NULL REFERENCES public.content_type_definitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  label_bn TEXT DEFAULT '',
  -- Field type
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'richtext', 'number', 'boolean', 'date', 'time',
    'datetime', 'select', 'multi_select', 'color', 'icon', 'media', 'file',
    'url', 'email', 'json', 'code', 'relation', 'group', 'repeater', 'block', 'tab'
  )),
  -- Validation
  required BOOLEAN NOT NULL DEFAULT false,
  unique_field BOOLEAN NOT NULL DEFAULT false,
  validation_rules JSONB DEFAULT '{}',
  -- Field options (for select/multi_select/relation)
  field_options JSONB DEFAULT '{}',
  -- Display
  placeholder TEXT DEFAULT '',
  placeholder_bn TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_bn TEXT DEFAULT '',
  default_value JSONB DEFAULT 'null',
  -- Layout
  group_name TEXT DEFAULT '',
  tab_name TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  column_span INTEGER NOT NULL DEFAULT 1 CHECK (column_span IN (1, 2, 3)),
  -- Conditional visibility
  show_if JSONB DEFAULT '{}',
  -- Metadata
  system_field BOOLEAN NOT NULL DEFAULT false,
  seo_field BOOLEAN NOT NULL DEFAULT false,
  -- Repeater/Block config: stores sub-field definitions for repeaters/blocks
  sub_fields JSONB DEFAULT '[]',
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Constraints
  UNIQUE(content_type_id, name)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_content_type_fields_sort
  ON public.content_type_fields (content_type_id, sort_order ASC);

CREATE INDEX idx_content_type_definitions_slug
  ON public.content_type_definitions (slug);

CREATE INDEX idx_content_type_definitions_type
  ON public.content_type_definitions (content_type);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.content_type_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_type_fields ENABLE ROW LEVEL SECURITY;

-- Admins can manage content type definitions
CREATE POLICY "Admins can manage content type definitions"
  ON public.content_type_definitions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- All authenticated users can read content type definitions (for rendering)
CREATE POLICY "Authenticated users can read content type definitions"
  ON public.content_type_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Public can read content type definitions (for frontend rendering)
CREATE POLICY "Public can read content type definitions"
  ON public.content_type_definitions
  FOR SELECT
  TO anon
  USING (true);

-- Admins can manage content type fields
CREATE POLICY "Admins can manage content type fields"
  ON public.content_type_fields
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- All authenticated users can read content type fields
CREATE POLICY "Authenticated users can read content type fields"
  ON public.content_type_fields
  FOR SELECT
  TO authenticated
  USING (true);

-- Public can read content type fields
CREATE POLICY "Public can read content type fields"
  ON public.content_type_fields
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Helper function: Get content type definition by slug
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_content_type_by_slug(type_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

-- ============================================================================
-- Helper function: Get all collection content types
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_collection_types()
RETURNS SETOF public.content_type_definitions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.content_type_definitions
  WHERE content_type = 'collection'
  ORDER BY label ASC;
$$;

-- ============================================================================
-- Helper function: Get all singleton content types
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_singleton_types()
RETURNS SETOF public.content_type_definitions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.content_type_definitions
  WHERE content_type = 'singleton'
  ORDER BY label ASC;
$$;

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_content_modeling_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_content_type_definitions_timestamp
  BEFORE UPDATE ON public.content_type_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();

CREATE TRIGGER update_content_type_fields_timestamp
  BEFORE UPDATE ON public.content_type_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();

-- ============================================================================
-- Table: dynamic_content_items
-- Generic JSONB storage for dynamic content type instances
-- ============================================================================
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

CREATE INDEX idx_dynamic_content_type_id ON public.dynamic_content_items (content_type_id);
CREATE INDEX idx_dynamic_content_status ON public.dynamic_content_items (status);
CREATE INDEX idx_dynamic_content_slug ON public.dynamic_content_items (slug);
CREATE INDEX idx_dynamic_content_created ON public.dynamic_content_items (created_at DESC);
CREATE INDEX idx_dynamic_content_scheduled ON public.dynamic_content_items (scheduled_at) WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.dynamic_content_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage dynamic content
CREATE POLICY "Admins can manage dynamic content"
  ON public.dynamic_content_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Authenticated users can read published dynamic content
CREATE POLICY "Users can read published dynamic content"
  ON public.dynamic_content_items
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Public can read published dynamic content
CREATE POLICY "Public can read published dynamic content"
  ON public.dynamic_content_items
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE TRIGGER update_dynamic_content_timestamp
  BEFORE UPDATE ON public.dynamic_content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_modeling_timestamp();
