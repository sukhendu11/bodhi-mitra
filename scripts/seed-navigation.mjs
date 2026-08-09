/**
 * Seed Navigation Items into Supabase (fallback) + Strapi instructions
 *
 * This script upserts the correct navigation structure into Supabase's
 * navigation_items table. The frontend reads from Strapi first, and
 * falls back to Supabase if Strapi is unavailable or returns 403.
 *
 * Nav structure:
 *   Home (internal) → /
 *   Reflections (dropdown)
 *   ├── Meditation → /reflections/meditation
 *   ├── Mindfulness → /reflections/mindfulness
 *   ├── Mental Health → /reflections/mental-health
 *   └── Philosophy → /reflections/philosophy
 *   Books (internal) → /books        ← standalone
 *   Videos (internal) → /videos      ← standalone
 *
 * Prerequisites:
 *   1. Run `bun install` in project root
 *   2. Ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/seed-navigation.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env\n" +
    "  The service role key is required because navigation_items table has RLS policies\n" +
    "  that restrict mutations to admin users. The anon key cannot bypass RLS.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

/* ─── Fixed UUIDs for reproducibility ─────────────────────────── */
const HOME_ID = "b1000000-0000-0000-0000-000000000000";
const BLOG_ID = "b1000000-0000-0000-0000-000000000001";
const MEDITATION_ID = "b1000000-0000-0000-0000-000000000002";
const MINDFULNESS_ID = "b1000000-0000-0000-0000-000000000003";
const MENTAL_HEALTH_ID = "b1000000-0000-0000-0000-000000000004";
const PHILOSOPHY_ID = "b1000000-0000-0000-0000-000000000005";
const BOOKS_ID = "b1000000-0000-0000-0000-000000000006";
const VIDEOS_ID = "b1000000-0000-0000-0000-000000000007";

async function seed() {
  console.log("🌱 Seeding navigation items into Supabase...\n");

  // 1. Delete old navigation items (will be re-created)
  const { error: delErr } = await supabase
    .from("navigation_items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) {
    console.error("❌ Failed to clear old nav items:", delErr.message);
    process.exit(1);
  }
  console.log("  ✅ Old navigation items cleared");

  // 2. Insert top-level items (Home, Blog dropdown, Books, Videos)
  const topLevel = [
    {
      id: HOME_ID,
      parent_id: null,
      type: "internal",
      label_en: "Home",
      label_bn: "হোম",
      url: "",
      slug: "/",
      icon: "",
      sort_order: 0,
      visible: true,
    },
    {
      id: BLOG_ID,
      parent_id: null,
      type: "dropdown",
      label_en: "Reflections",
      label_bn: "প্রতিফলন",
      url: "",
      slug: "/reflections",
      icon: "",
      sort_order: 1,
      visible: true,
    },
    {
      id: BOOKS_ID,
      parent_id: null,
      type: "internal",
      label_en: "Books",
      label_bn: "বই",
      url: "",
      slug: "/books",
      icon: "",
      sort_order: 2,
      visible: true,
    },
    {
      id: VIDEOS_ID,
      parent_id: null,
      type: "internal",
      label_en: "Videos",
      label_bn: "ভিডিও",
      url: "",
      slug: "/videos",
      icon: "",
      sort_order: 3,
      visible: true,
    },
  ];

  const { error: tlErr } = await supabase.from("navigation_items").insert(topLevel);
  if (tlErr) {
    console.error("❌ Failed to insert top-level items:", tlErr.message);
    process.exit(1);
  }
  console.log("  ✅ Top-level items inserted: Home, Reflections, Books, Videos");

  // 3. Insert Blog child items (category pages)
  const children = [
    {
      id: MEDITATION_ID,
      parent_id: BLOG_ID,
      type: "internal",
      label_en: "Meditation",
      label_bn: "ধ্যান",
      url: "",
      slug: "/reflections/meditation",
      icon: "",
      sort_order: 0,
      visible: true,
    },
    {
      id: MINDFULNESS_ID,
      parent_id: BLOG_ID,
      type: "internal",
      label_en: "Mindfulness",
      label_bn: "মাইন্ডফুলনেস",
      url: "",
      slug: "/reflections/mindfulness",
      icon: "",
      sort_order: 1,
      visible: true,
    },
    {
      id: MENTAL_HEALTH_ID,
      parent_id: BLOG_ID,
      type: "internal",
      label_en: "Mental Health",
      label_bn: "মানসিক স্বাস্থ্য",
      url: "",
      slug: "/reflections/mental-health",
      icon: "",
      sort_order: 2,
      visible: true,
    },
    {
      id: PHILOSOPHY_ID,
      parent_id: BLOG_ID,
      type: "internal",
      label_en: "Philosophy",
      label_bn: "দর্শন",
      url: "",
      slug: "/reflections/philosophy",
      icon: "",
      sort_order: 3,
      visible: true,
    },
  ];

  const { error: chErr } = await supabase.from("navigation_items").insert(children);
  if (chErr) {
    console.error("❌ Failed to insert Blog children:", chErr.message);
    process.exit(1);
  }
  console.log("  ✅ Blog children inserted: Meditation, Mindfulness, Mental Health, Philosophy");

  console.log("\n✅ Navigation items seeded successfully!");
  console.log("\n📋 Structure:");
  console.log("  Home        (internal)       → /");
  console.log("  Reflections (dropdown)");
  console.log("  ├── Meditation     → /reflections/meditation");
  console.log("  ├── Mindfulness    → /reflections/mindfulness");
  console.log("  ├── Mental Health  → /reflections/mental-health");
  console.log("  └── Philosophy     → /reflections/philosophy");
  console.log("  Books       (internal)       → /books");
  console.log("  Videos      (internal)       → /videos");
  console.log(
    "\n💡 Note: The frontend reads from Strapi first. To use Strapi nav items:\n" +
    "   1. Open http://localhost:1337/admin\n" +
    "   2. Go to Settings → API Tokens → Create new token\n" +
    "   3. Select 'Custom' token type, check 'find' and 'findone' for Navigation\n" +
    "   4. Copy the token to .env as VITE_STRAPI_API_TOKEN\n"
  );
}

seed().catch(console.error);
