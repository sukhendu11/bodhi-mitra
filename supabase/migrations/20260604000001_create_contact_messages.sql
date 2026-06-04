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
