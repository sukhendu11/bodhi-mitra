CREATE TYPE public.post_status AS ENUM ('draft', 'published');

ALTER TABLE public.posts
  ADD COLUMN status public.post_status NOT NULL DEFAULT 'draft';

UPDATE public.posts SET status = 'published' WHERE status = 'draft';

DROP POLICY IF EXISTS "Posts are publicly viewable" ON public.posts;

CREATE POLICY "Published posts are publicly viewable"
ON public.posts
FOR SELECT
USING (status = 'published' OR has_role(auth.uid(), 'admin'::app_role));