-- ============================================================================
-- Bodhi Mitra — Add storage_provider column to media_assets
-- ============================================================================
-- Replaces heuristic R2-vs-Supabase detection (.r2.dev URL checks) with a
-- deterministic column. Every uploaded file records which storage backend
-- it lives in.
-- ============================================================================

ALTER TABLE public.media_assets
  ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'supabase';

-- All existing rows were uploaded via Supabase Storage, so the default is correct.
-- Going forward, new uploads will explicitly set 'r2' or 'supabase'.

COMMENT ON COLUMN public.media_assets.storage_provider IS
  'Storage backend: ''supabase'' or ''r2''. Used to determine which API to call for deletions and other storage operations.';

-- Index to quickly filter by storage backend
CREATE INDEX IF NOT EXISTS idx_media_assets_storage_provider
  ON public.media_assets (storage_provider);
