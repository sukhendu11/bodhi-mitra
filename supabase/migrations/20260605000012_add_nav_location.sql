-- ============================================================================
-- Bodhi Mitra — Navigation Location Support
-- ============================================================================
-- Adds a `location` column to navigation_items for separating header
-- and footer menus. Default is 'header' for backward compatibility.
-- ============================================================================

-- Add location column
ALTER TABLE public.navigation_items ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'header'
  CHECK (location IN ('header', 'footer'));

-- Update seed data: mark existing items as header
UPDATE public.navigation_items SET location = 'header' WHERE location = 'header';

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_nav_items_location ON public.navigation_items (location);
