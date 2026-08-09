/**
 * Seed a FRESH Strapi instance with base content (admin user, API token,
 * categories, navigation).
 *
 * OPTIONAL helper — everything here can be done by hand in the Strapi admin
 * panel instead (see PROJECT.md §18 → "Manual Setup Kit"). Use this only if
 * you prefer scripting. It runs against the DATABASE of the running Strapi
 * instance (SQLite dev DB or the configured Postgres).
 *
 * Usage (from inside the strapi/ folder so @strapi/strapi resolves):
 *   cd strapi
 *   STRAPI_ADMIN_EMAIL=you@example.com STRAPI_ADMIN_PASSWORD='strong-password' \
 *     node ../scripts/seed-strapi-full.mjs
 *
 * Notes:
 *   - Credentials are read from the environment — never hardcoded.
 *   - The API token created here is READ-ONLY (safe for the public
 *     `VITE_STRAPI_API_TOKEN` env var, which is bundled client-side).
 *   - Seeding uses the low-level query API (fine for category/navigation,
 *     which have draftAndPublish off). For publishable types (posts, books,
 *     videos, pages) use Strapi v5's Document Service so entries are created
 *     in a published state.
 */

import { createStrapi } from "@strapi/strapi";

async function seed() {
  const app = await createStrapi().load();

  // 1. Register admin (env-driven)
  const adminEmail = process.env.STRAPI_ADMIN_EMAIL;
  const adminPassword = process.env.STRAPI_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error("Set STRAPI_ADMIN_EMAIL and STRAPI_ADMIN_PASSWORD first.");
    process.exit(1);
  }

  // Look up the Super Admin role instead of assuming id 1 on a fresh DB
  let superAdminRoleId = 1;
  try {
    const roles = await app.db.query("admin::role").findMany({});
    const superAdmin = roles.find((r) => r.code === "strapi-super-admin" || r.name === "Super Admin");
    if (superAdmin) superAdminRoleId = superAdmin.id;
  } catch (err) {
    console.warn("Could not look up Super Admin role, falling back to id 1:", err.message);
  }

  const adminUser = await app.admin.services.user.create({
    email: adminEmail,
    firstname: "Admin",
    lastname: "User",
    password: adminPassword,
    isActive: true,
    roles: [superAdminRoleId],
  });
  console.log("Admin created:", adminUser.id);

  // 2. Create a READ-ONLY API token — copy the accessKey into
  //    .env VITE_STRAPI_API_TOKEN (client-side, so read-only is required)
  const token = await app.admin.services["api-token"].create({
    name: "Frontend Read Token",
    description: "Public read access for the frontend (read-only)",
    type: "read-only",
    lifespan: null,
  });
  console.log("API token created — VITE_STRAPI_API_TOKEN =", token.accessKey);

  // 3. Seed categories — must match the current frontend taxonomy
  //    (src/lib/mock-data.ts MOCK_CATEGORIES_DATA, colors included)
  const categories = [
    { name_en: "Meditation", name_bn: "ধ্যান", slug: "meditation", sort_order: 0, color: "#8B5CF6", visible: true },
    { name_en: "Mindfulness", name_bn: "মাইন্ডফুলনেস", slug: "mindfulness", sort_order: 1, color: "#10B981", visible: true },
    { name_en: "Mental Health", name_bn: "মানসিক স্বাস্থ্য", slug: "mental-health", sort_order: 2, color: "#F59E0B", visible: true },
    { name_en: "Philosophy", name_bn: "দর্শন", slug: "philosophy", sort_order: 3, color: "#3B82F6", visible: true },
    { name_en: "Buddhist Psychology", name_bn: "বৌদ্ধ মনোবিজ্ঞান", slug: "buddhist-psychology", sort_order: 4, color: "#EC4899", visible: true },
  ];
  for (const c of categories) {
    const entry = await app.db.query("api::category.category").create({ data: c });
    console.log("Category created:", entry.name_en);
  }

  // 4. Seed header navigation — simplified design (no dropdown children;
  //    Reflections is a flat link to /reflections, About added per header redesign)
  const navItems = [
    { title_en: "Home", title_bn: "হোম", url: "/", type: "internal", sort_order: 0, location: "header" },
    { title_en: "Reflections", title_bn: "প্রতিফলন", url: "/reflections", type: "internal", sort_order: 1, location: "header" },
    { title_en: "Books", title_bn: "বই", url: "/books", type: "internal", sort_order: 2, location: "header" },
    { title_en: "Videos", title_bn: "ভিডিও", url: "/videos", type: "internal", sort_order: 3, location: "header" },
    { title_en: "About", title_bn: "সম্পর্কে", url: "/about", type: "internal", sort_order: 4, location: "header" },
  ];
  for (const n of navItems) {
    const entry = await app.db.query("api::navigation.navigation").create({ data: n });
    console.log("Nav created:", entry.title_en);
  }

  console.log("\nAll seed data created successfully!");
  await app.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
