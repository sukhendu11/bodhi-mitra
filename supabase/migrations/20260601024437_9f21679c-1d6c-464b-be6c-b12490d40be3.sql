-- Restrict anonymous visitors from reading user_id (auth UUID) from comments,
-- preventing user enumeration. Authenticated users still see user_id so the UI
-- can determine ownership for edit/delete actions.
REVOKE SELECT ON public.comments FROM anon;
GRANT SELECT (id, post_id, parent_id, comment_text, user_name, created_at, updated_at)
  ON public.comments TO anon;