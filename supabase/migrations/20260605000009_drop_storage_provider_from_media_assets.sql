-- Revert: storage_provider column is no longer needed (R2 removed, Supabase-only)
ALTER TABLE media_assets DROP COLUMN IF EXISTS storage_provider;

-- Drop the index added in the previous migration
DROP INDEX IF EXISTS idx_media_assets_storage_provider;

COMMENT ON COLUMN media_assets.storage_provider IS NULL;
