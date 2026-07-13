-- Extend bookmarks table to support polymorphic resources (posts + books + future)
-- Replaces the post_id-only constraint with resource_id + resource_type pattern.

-- 1. Add polymorphic columns (nullable initially for backfill)
ALTER TABLE public.bookmarks
  ADD COLUMN resource_id UUID,
  ADD COLUMN resource_type VARCHAR(50);

-- 2. Backfill existing post bookmarks
UPDATE public.bookmarks
SET resource_id = post_id, resource_type = 'post'
WHERE post_id IS NOT NULL;

-- 3. Set NOT NULL after backfill
ALTER TABLE public.bookmarks
  ALTER COLUMN resource_id SET NOT NULL,
  ALTER COLUMN resource_type SET NOT NULL;

-- 4. Drop old post_id column
ALTER TABLE public.bookmarks DROP COLUMN post_id;

-- 5. Drop old unique constraint
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_post_id_key;

-- 6. Add new composite unique constraint
ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_resource_key UNIQUE (user_id, resource_id, resource_type);

-- 7. Add index for efficient lookups by resource
CREATE INDEX IF NOT EXISTS idx_bookmarks_resource
  ON public.bookmarks (resource_id, resource_type);

-- 8. Update RLS policies (they use auth.uid() which remains valid)
-- The existing SELECT/INSERT/DELETE policies still work since they only check user_id.
