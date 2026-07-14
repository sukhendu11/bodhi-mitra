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
