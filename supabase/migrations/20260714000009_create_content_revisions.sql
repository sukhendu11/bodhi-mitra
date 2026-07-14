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
