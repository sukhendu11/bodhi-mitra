-- Seed Strapi Navigation Items
-- Run: cd strapi && sqlite3 .tmp/data.db < ../scripts/seed-strapi-nav.sql
--
-- Nav structure:
--   Home (internal) → /
--   Reflections (dropdown)
--   ├── Meditation → /reflections/meditation
--   ├── Mindfulness → /reflections/mindfulness
--   ├── Mental Health → /reflections/mental-health
--   ├── Philosophy → /reflections/philosophy
--   └── Buddhist Psychology → /reflections/buddhist-psychology
--   Books (internal) → /books              (standalone)
--   Videos (internal) → /videos            (standalone)
--
-- After running: restart Strapi (npm run develop) so it picks up changes

-- Idempotency: clear existing nav items before inserting
DELETE FROM navigations_parent_lnk;
DELETE FROM navigations;

-- Use explicit IDs to avoid auto-increment drift after multiple seed runs
INSERT INTO navigations (id, document_id, title_en, title_bn, url, type, target, location, visible, sort_order, created_at, updated_at, published_at)
VALUES
  -- 1: Home (standalone top-level)
  (1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Home',           'হোম',     '',                 'internal', '', 'header', 1, 0, datetime('now'), datetime('now'), datetime('now')),
  -- 2: Reflections (dropdown parent — navigates to /reflections)
  (2, 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Reflections',    'প্রতিফলন',  '/reflections',      'dropdown', '', 'header', 1, 1, datetime('now'), datetime('now'), datetime('now')),
  -- 3-6: Blog children (category pages)
  (3, 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Meditation',     'ধ্যান',    '/reflections/meditation',  'internal', '', 'header', 1, 0, datetime('now'), datetime('now'), datetime('now')),
  (4, 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Mindfulness',    'মাইন্ডফুলনেস', '/reflections/mindfulness', 'internal', '', 'header', 1, 1, datetime('now'), datetime('now'), datetime('now')),
  (5, 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Mental Health',  'মানসিক স্বাস্থ্য', '/reflections/mental-health', 'internal', '', 'header', 1, 2, datetime('now'), datetime('now'), datetime('now')),
  (6, 'f6a7b8c9-d0e1-2345-fabc-345678901234', 'Philosophy',     'দর্শন',   '/reflections/philosophy', 'internal', '', 'header', 1, 3, datetime('now'), datetime('now'), datetime('now')),
  (9, '9f8e7d6c-5b4a-3c2d-1e0f-a9b8c7d6e5f4', 'Buddhist Psychology', 'বৌদ্ধ মনোবিজ্ঞান', '/reflections/buddhist-psychology', 'internal', '', 'header', 1, 4, datetime('now'), datetime('now'), datetime('now')),
  -- 7: Books (standalone top-level)
  (7, 'a7b8c9d0-e1f2-3456-abc7-890123456789', 'Books',          'বই',       '/books',            'internal', '', 'header', 1, 2, datetime('now'), datetime('now'), datetime('now')),
  -- 8: Videos (standalone top-level)
  (8, 'b8c9d0e1-f2a3-4567-bcd8-901234567890', 'Videos',         'ভিডিও',    '/videos',           'internal', '', 'header', 1, 3, datetime('now'), datetime('now'), datetime('now'));

-- Set up parent-child relationships: children (3-6, 9) under Reflections (id=2)
INSERT INTO navigations_parent_lnk (navigation_id, inv_navigation_id)
VALUES
  (3, 2),  -- Meditation → Reflections
  (4, 2),  -- Mindfulness → Reflections
  (5, 2),  -- Mental Health → Reflections
  (6, 2),  -- Philosophy → Reflections
  (9, 2);  -- Buddhist Psychology → Reflections

-- Clear any cached nav data so the frontend fresh-fetches from Strapi
-- (The frontend uses a localStorage cache key 'bodhi-nav-cache-v1')
