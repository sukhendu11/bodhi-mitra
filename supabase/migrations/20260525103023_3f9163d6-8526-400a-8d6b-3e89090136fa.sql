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