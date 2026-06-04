-- Performance indexes for posts and comments queries
-- Created: 2026-06-04

-- Posts: slug is used for individual post lookups (fetchPostBySlug)
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts (slug);

-- Posts: created_at is used for ordering (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- Posts: category is used for filtering (WHERE category = ?)
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts (category);

-- Posts: status is used for filtering published posts (WHERE status = 'published')
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts (status);

-- Composite index for the most common query pattern:
-- WHERE status = 'published' AND category = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_status_category_created_at
  ON public.posts (status, category, created_at DESC);

-- Comments: post_id is used for fetching comments by post (WHERE post_id = ?)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
