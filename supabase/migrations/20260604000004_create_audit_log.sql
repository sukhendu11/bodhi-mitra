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
