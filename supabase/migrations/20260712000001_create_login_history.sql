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
