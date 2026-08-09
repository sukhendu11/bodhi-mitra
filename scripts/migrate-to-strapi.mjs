#!/usr/bin/env node
/**
 * Bodhi Mitra — Supabase → Strapi Data Migration Script
 * ======================================================
 *
 * Exports all content from Supabase PostgreSQL and imports into Strapi v5
 * (via REST API). Handles relations, self-references, and content type
 * transformations.
 *
 * USAGE:
 *   node scripts/migrate-to-strapi.mjs
 *
 * ENV VARS (from .env):
 *   VITE_SUPABASE_URL / SUPABASE_URL     — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY             — Service role key (for data export)
 *   SUPABASE_MANAGEMENT_KEY               — Fallback if SDK unavailable (sbp_...)
 *   STRAPI_URL / VITE_STRAPI_URL          — Strapi instance URL
 *   STRAPI_API_TOKEN / VITE_STRAPI_API_TOKEN — Strapi API token
 *
 * ORDER OF IMPORT:
 *   1. Categories (no dependencies)
 *   2. Tags (no dependencies)
 *   3. Pages (no dependencies)
 *   4. Videos (no dependencies)
 *   5. Courses (no dependencies)
 *   6. Posts (depends on categories, tags)
 *   7. Books (depends on categories, tags)
 *   8. Navigation (self-referencing parent)
 *   9. Comments (self-referencing parent)
 *   10. Site Settings (singleton)
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ═══════════════════════════════════════════════════════════════════════════
 * ENVIRONMENT SETUP
 * ═══════════════════════════════════════════════════════════════════════════ */

const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const CFG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  managementToken: process.env.SUPABASE_MANAGEMENT_KEY,
  strapiUrl: process.env.STRAPI_URL || process.env.VITE_STRAPI_URL || "http://localhost:1337",
  strapiToken: process.env.STRAPI_API_TOKEN || process.env.VITE_STRAPI_API_TOKEN,
};

/* ═══════════════════════════════════════════════════════════════════════════
 * SUPABASE CLIENT — uses @supabase/supabase-js when available
 * ═══════════════════════════════════════════════════════════════════════════ */

let supabase = null;
let supabaseSdkAvailable = false;

async function initSupabase() {
  if (supabase) return supabase;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    if (CFG.supabaseUrl && CFG.serviceRoleKey) {
      supabase = createClient(CFG.supabaseUrl, CFG.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      supabaseSdkAvailable = true;
      console.log("  Using Supabase SDK (service_role key)");
      return supabase;
    }
  } catch {
    // SDK not available
  }

  console.log("  Using Supabase Management API (requires sbp_ token)");
  return null;
}

/** Query Supabase using SDK (preferred) or Management API (fallback). */
async function supabaseQuery(query, table, select = "*") {
  // Try SDK first
  if (supabaseSdkAvailable && supabase) {
    const { data, error } = await supabase.from(table).select(select).order("created_at", { ascending: true });
    if (error) throw new Error(`Supabase SDK error: ${error.message}`);
    return data || [];
  }

  // Fallback: Management API (needs sbp_ token)
  if (!CFG.managementToken) {
    throw new Error("No SUPABASE_MANAGEMENT_KEY set for Management API fallback");
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/ptqxdikjfcbgnwhwfefi/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${CFG.managementToken}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Supabase API ${res.statusCode}: ${data.substring(0, 200)}`));
          } else {
            try { resolve(JSON.parse(data)); } catch { resolve(data); }
          }
        });
      }
    );
    req.write(body);
    req.end();
    req.on("error", reject);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * STRAPI REST API
 * ═══════════════════════════════════════════════════════════════════════════ */

function strapiFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CFG.strapiUrl}/api${endpoint}`);
    const isHttps = url.protocol === "https:";
    const mod = isHttps ? https : http;

    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (CFG.strapiToken) headers["Authorization"] = `Bearer ${CFG.strapiToken}`;

    const body = options.body ? JSON.stringify(options.body) : undefined;

    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || "GET",
        headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          if (res.statusCode >= 400) {
            const msg = parsed?.error?.message || parsed?.message || data.substring(0, 200);
            reject(new Error(`Strapi ${res.statusCode}: ${msg}`));
          } else {
            resolve(parsed);
          }
        });
      }
    );
    if (body) req.write(body);
    req.end();
    req.on("error", reject);
  });
}

async function strapiCreate(contentType, data) {
  const res = await strapiFetch(`/${contentType}`, { method: "POST", body: { data } });
  return { id: res.data.id, documentId: res.data.documentId };
}

async function strapiUpdateSingleton(contentType, data) {
  const res = await strapiFetch(`/${contentType}`, { method: "PUT", body: { data } });
  return res.data;
}

async function strapiList(contentType) {
  const res = await strapiFetch(`/${contentType}?pagination[pageSize]=200&sort=id:asc`);
  return res.data || [];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HTML → Strapi Blocks Converter
 * ═══════════════════════════════════════════════════════════════════════════ */

function htmlToBlocks(html) {
  if (!html || typeof html !== "string") return null;
  const blocks = [];
  const parts = html.split(/(<\/?(?:p|h[1-6]|blockquote|ul|ol|li|pre|div|hr)\b[^>]*>)/gi);
  let currentTag = null;
  let textBuffer = "";

  function flushText() {
    const t = textBuffer.trim();
    if (!t) return;
    const clean = t.replace(/<[^>]*>/g, "").trim();
    if (clean) {
      blocks.push({
        type: currentTag === "blockquote" ? "quote" : "paragraph",
        children: [{ type: "text", text: clean }],
      });
    }
    textBuffer = "";
  }

  for (const part of parts) {
    const tagMatch = part.match(/^<\/?([a-z0-9]+)\b[^>]*>$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "div"].includes(tag)) {
        if (tag.startsWith("/")) { flushText(); currentTag = null; }
        else currentTag = tag;
      } else if (tag === "li") textBuffer += "\n• ";
      else if (tag === "br") textBuffer += "\n";
    } else textBuffer += part;
  }
  flushText();

  if (blocks.length === 0) {
    const clean = html.replace(/<[^>]*>/g, "").trim();
    if (clean) blocks.push({ type: "paragraph", children: [{ type: "text", text: clean }] });
  }

  return blocks.length > 0 ? blocks : null;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DATA TRANSFORMATIONS (Supabase → Strapi)
 * ═══════════════════════════════════════════════════════════════════════════ */

function toStrapiCategory(r) {
  return { name_en: r.name_en || r.name || "", name_bn: r.name_bn || "", slug: r.slug,
    description_en: r.description_en || "", description_bn: r.description_bn || "",
    color: r.color || "#6B7280", visible: r.visible !== false, sort_order: r.sort_order ?? 0 };
}

function toStrapiTag(r) {
  return { name_en: r.name_en || r.name || "", name_bn: r.name_bn || "", slug: r.slug, color: r.color || "#6B7280" };
}

function toStrapiPage(r) {
  const ce = [];
  if (r.header_en) ce.push({ type: "heading", level: 2, children: [{ type: "text", text: r.header_en }] });
  if (r.body_en) ce.push({ type: "paragraph", children: [{ type: "text", text: r.body_en }] });
  const cb = [];
  if (r.header_bn) cb.push({ type: "heading", level: 2, children: [{ type: "text", text: r.header_bn }] });
  if (r.body_bn) cb.push({ type: "paragraph", children: [{ type: "text", text: r.body_bn }] });
  return { title_en: r.title_en || "", title_bn: r.title_bn || "", slug: r.slug,
    content_en: ce.length > 0 ? ce : undefined, content_bn: cb.length > 0 ? cb : undefined,
    banner_url: r.banner_url || "", visible: r.visible !== false, sort_order: r.sort_order ?? 0,
    publishedAt: new Date().toISOString() };
}

function toStrapiVideo(r) {
  let embed = r.youtube_url || r.embed_url || "";
  if (embed.includes("youtube.com/watch?v=")) {
    const v = new URL(embed).searchParams.get("v");
    if (v) embed = `https://www.youtube.com/embed/${v}`;
  } else if (embed.includes("youtu.be/")) {
    const v = embed.split("youtu.be/")[1]?.split("?")[0];
    if (v) embed = `https://www.youtube.com/embed/${v}`;
  }
  return { title_en: r.title || "", title_bn: r.title_bn || "",
    slug: r.slug || r.title?.toLowerCase().replace(/\s+/g, "-") || "",
    description_en: r.description || "", description_bn: r.description_bn || "",
    embed_url: embed, duration: r.duration || null, sort_order: r.sort_order ?? 0,
    publishedAt: r.status === "published" ? new Date().toISOString() : null };
}

function toStrapiCourse(r, lessons) {
  return { title_en: r.title_en || "", title_bn: r.title_bn || "", slug: r.slug,
    description_en: htmlToBlocks(r.description_en || ""), description_bn: htmlToBlocks(r.description_bn || ""),
    price: r.price ?? 0, is_free: r.is_free !== false,
    course_status: r.published ? "published" : "draft", sort_order: r.sort_order ?? 0,
    lessons: lessons ? JSON.stringify(lessons) : null,
    publishedAt: r.published ? new Date().toISOString() : null };
}

function toStrapiPost(r) {
  const contentEn = r.content_en || r.content || "";
  const wc = contentEn ? contentEn.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length : 0;
  return { title_en: r.title_en || r.title || "", title_bn: r.title_bn || "", slug: r.slug,
    content_en: htmlToBlocks(contentEn), content_bn: htmlToBlocks(r.content_bn || ""),
    excerpt_en: (r.excerpt_en || r.excerpt || "").replace(/<[^>]*>/g, "").substring(0, 500),
    excerpt_bn: (r.excerpt_bn || "").replace(/<[^>]*>/g, "").substring(0, 500),
    author: r.author_name || "", reading_time: Math.max(1, Math.round(wc / 200)),
    featured: r.featured || false, sort_order: r.sort_order ?? 0,
    publishedAt: r.status === "published" ? new Date().toISOString() : null };
}

function toStrapiBook(r) {
  return { title_en: r.title_en || r.title || "", title_bn: r.title_bn || "", slug: r.slug,
    description_en: htmlToBlocks(r.description_en || r.description || ""),
    description_bn: htmlToBlocks(r.description_bn || ""),
    author_name: r.author_name || "", price: r.price ?? 0, is_free: r.is_free !== false,
    book_status: r.status || "draft", rating: r.rating ?? 0, rating_count: r.rating_count ?? 0,
    featured: r.featured || false, sort_order: r.sort_order ?? 0,
    publishedAt: r.status === "published" ? new Date().toISOString() : null };
}

function toStrapiNavItem(r) {
  return { title_en: r.label_en || "", title_bn: r.label_bn || "", url: r.slug || r.url || "/",
    type: r.type || "internal", target: r.target || null, location: r.location || "header",
    visible: r.visible !== false, sort_order: r.sort_order ?? 0 };
}

function toStrapiComment(r) {
  return { content: r.comment_text || r.content || "",
    author_name: r.user_name || r.author_name || "", author_email: r.user_email || r.author_email || "",
    status: r.status || "approved" };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROGRESS TRACKING
 * ═══════════════════════════════════════════════════════════════════════════ */

const stats = {};

async function log(label, fn) {
  process.stdout.write(`  ${label} ... `);
  try {
    const result = await fn();
    console.log("✓");
    return result;
  } catch (err) {
    console.log("✗");
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

function summary(contentType, created, skipped = 0) {
  stats[contentType] = { created, skipped };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EXPORT FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════ */

async function exportTable(table, select = "*") {
  if (supabaseSdkAvailable) {
    return supabaseQuery("", table, select);
  }
  return supabaseQuery(`SELECT * FROM public.${table}`, table, select);
}

async function exportCourseLessons(courseIds) {
  if (!courseIds.length) return {};

  if (supabaseSdkAvailable) {
    const { data } = await supabase.from("course_lessons").select("*").in("course_id", courseIds).order("sort_order");
    const grouped = {};
    for (const row of (data || [])) {
      if (!grouped[row.course_id]) grouped[row.course_id] = [];
      grouped[row.course_id].push(row);
    }
    return grouped;
  }

  const ids = courseIds.map((id) => `'${id}'`).join(",");
  const rows = await supabaseQuery(
    `SELECT * FROM public.course_lessons WHERE course_id IN (${ids}) ORDER BY sort_order ASC`,
    "course_lessons"
  );
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.course_id]) grouped[row.course_id] = [];
    grouped[row.course_id].push(row);
  }
  return grouped;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * IMPORT FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════ */

async function importTaxonomy(contentType, rows, toStrapiFn) {
  if (!rows?.length) { console.log(`    0 ${contentType}`); summary(contentType, 0); return {}; }

  let existing = [];
  try { existing = await strapiList(contentType); } catch { /* Strapi unavailable */ }
  const existingBySlug = {};
  for (const item of existing) existingBySlug[item.slug] = item;

  const idMap = {};
  let created = 0, skipped = 0;

  for (const row of rows) {
    if (existingBySlug[row.slug]) {
      idMap[row.id] = existingBySlug[row.slug].id;
      skipped++;
      continue;
    }
    try {
      const result = await strapiCreate(contentType, toStrapiFn(row));
      idMap[row.id] = result.id;
      created++;
    } catch (err) {
      console.error(`\n    Error: ${err.message}`);
      skipped++;
    }
  }
  console.log(`    ${contentType}: ${created} created, ${skipped} skipped`);
  summary(contentType, created, skipped);
  return idMap;
}

async function importContent(contentType, rows, toStrapiFn) {
  if (!rows?.length) { console.log(`    0 ${contentType}`); summary(contentType, 0); return {}; }

  let existing = [];
  try { existing = await strapiList(contentType); } catch { /* Strapi unavailable */ }
  const existingBySlug = {};
  for (const item of existing) existingBySlug[item.slug] = item;

  const idMap = {};
  let created = 0, skipped = 0;

  for (const row of rows) {
    if (existingBySlug[row.slug]) {
      idMap[row.id] = existingBySlug[row.slug].id;
      skipped++;
      continue;
    }
    try {
      const result = await strapiCreate(contentType, toStrapiFn(row));
      idMap[row.id] = result.id;
      idMap[row.slug] = result.id;
      created++;
    } catch (err) {
      console.error(`\n    Error importing "${row.slug}": ${err.message}`);
      skipped++;
    }
  }
  console.log(`    ${contentType}: ${created} created, ${skipped} skipped`);
  summary(contentType, created, skipped);
  return idMap;
}

async function importNavigation(rows) {
  if (!rows?.length) { console.log("    0 navigation"); summary("navigation", 0); return {}; }

  let existing = [];
  try { existing = await strapiList("navigations"); } catch { /* ignore */ }
  const existingByUrl = {};
  for (const item of existing) existingByUrl[item.url] = item;

  const idMap = {};
  const parents = rows.filter((r) => !r.parent_id);
  let created = 0, skipped = 0;

  for (const row of parents) {
    const url = row.slug || row.url || "/";
    if (existingByUrl[url]) { idMap[row.id] = existingByUrl[url].id; skipped++; continue; }
    try {
      const result = await strapiCreate("navigations", toStrapiNavItem(row));
      idMap[row.id] = result.id;
      created++;
    } catch (err) { console.error(`\n    Error: ${err.message}`); skipped++; }
  }
  console.log(`    Navigation parents: ${created} created, ${skipped} skipped`);

  const children = rows.filter((r) => r.parent_id);
  let cCreated = 0, cSkipped = 0;
  for (const row of children) {
    const parentId = idMap[row.parent_id];
    if (!parentId) { cSkipped++; continue; }
    try {
      const data = toStrapiNavItem(row);
      data.parent = parentId;
      const result = await strapiCreate("navigations", data);
      idMap[row.id] = result.id;
      cCreated++;
    } catch (err) { console.error(`\n    Error: ${err.message}`); cSkipped++; }
  }
  console.log(`    Navigation children: ${cCreated} created, ${cSkipped} skipped`);
  summary("navigation", created + cCreated, skipped + cSkipped);
  return idMap;
}

async function importComments(rows) {
  if (!rows?.length) { console.log("    0 comments"); summary("comments", 0); return {}; }

  const idMap = {};
  const parents = rows.filter((r) => !r.parent_id);
  let created = 0, skipped = 0;

  for (const row of parents) {
    try {
      const result = await strapiCreate("comments", toStrapiComment(row));
      idMap[row.id] = result.id;
      created++;
    } catch (err) { console.error(`\n    Error: ${err.message}`); skipped++; }
  }
  console.log(`    Top-level comments: ${created} created, ${skipped} skipped`);

  const replies = rows.filter((r) => r.parent_id);
  let rCreated = 0, rSkipped = 0;
  for (const row of replies) {
    const parentId = idMap[row.parent_id];
    if (!parentId) { rSkipped++; continue; }
    try {
      const data = toStrapiComment(row);
      data.parent = parentId;
      const result = await strapiCreate("comments", data);
      idMap[row.id] = result.id;
      rCreated++;
    } catch (err) { console.error(`\n    Error: ${err.message}`); rSkipped++; }
  }
  console.log(`    Replies: ${rCreated} created, ${rSkipped} skipped`);
  summary("comments", created + rCreated, skipped + rSkipped);
  return idMap;
}

async function importSiteSettings(rows) {
  if (!rows?.length) { console.log("    0 site settings"); summary("sitesetting", 0); return; }

  const row = rows[0];
  let config = {};
  if (row.config && typeof row.config === "object") config = row.config;
  else if (typeof row.config === "string") try { config = JSON.parse(row.config); } catch { config = {}; }

  const data = {
    site_name: config?.branding?.site_name || row.site_name || "Sabbe Satta",
    site_name_bn: config?.branding?.site_name_bn || "",
    site_tagline_en: config?.branding?.tagline || "", site_tagline_bn: config?.branding?.tagline_bn || "",
    accent_color: config?.branding?.accent_color || "#92400E",
    maintenance_mode: config?.maintenance?.enabled || false,
    maintenance_message_en: config?.maintenance?.message_en || "",
    maintenance_message_bn: config?.maintenance?.message_bn || "",
    meta_title: config?.seo?.meta_title || "", meta_description: config?.seo?.meta_description || "",
    config,
  };

  try {
    await strapiUpdateSingleton("sitesetting", data);
    console.log("    Site settings updated ✓");
    summary("sitesetting", 1);
  } catch (err) {
    console.error(`\n    Error updating site settings: ${err.message}`);
    summary("sitesetting", 0, 1);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN
 * ═══════════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        Supabase → Strapi Data Migration                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  // Validate config
  await initSupabase();

  if (!supabaseSdkAvailable && !CFG.managementToken) {
    console.error("  Error: Need either Supabase SDK (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
    console.error("         or SUPABASE_MANAGEMENT_KEY (sbp_ token) for data export.");
    console.error("  Check your .env file.");
    process.exit(1);
  }

  if (CFG.strapiToken) {
    console.log(`  Strapi: ${CFG.strapiUrl} (authenticated)`);
  } else {
    console.log(`  Strapi: ${CFG.strapiUrl} (no token — will save data as JSON files)`);
  }
  console.log("");

  // ── STEP 1: Export all data ────────────────────────────────────
  console.log("═══ Step 1: Exporting from Supabase ═══\n");

  let categories, tags, pages, videos, courses, posts, books;
  let contentCategories, contentTags, navItems, comments, siteSettingsRows;

  // Use allSettled so individual table failures don't crash the export
  const exportResults = await Promise.allSettled([
    log("  Exporting categories", () => exportTable("categories")),
    log("  Exporting tags", () => exportTable("tags")),
    log("  Exporting pages", () => exportTable("pages")),
    log("  Exporting videos", () => exportTable("videos")),
    log("  Exporting courses", () => exportTable("courses")),
    log("  Exporting posts", () => exportTable("posts")),
    log("  Exporting books", () => exportTable("books")),
    log("  Exporting content_categories", () => exportTable("content_categories")),
    log("  Exporting content_tags", () => exportTable("content_tags")),
    log("  Exporting navigation_items", () => exportTable("navigation_items")),
    log("  Exporting comments", () => exportTable("comments")),
    log("  Exporting site_settings", () => exportTable("site_settings")),
  ]);

  [categories, tags, pages, videos, courses, posts, books,
   contentCategories, contentTags, navItems, comments, siteSettingsRows] =
    exportResults.map((r) => (r.status === "fulfilled" ? r.value : []));

  // Export course lessons
  const courseIds = courses.map((c) => c.id).filter(Boolean);
  let lessonsByCourse = {};
  if (courseIds.length > 0) {
    try {
      lessonsByCourse = await log(`  Exporting course_lessons (${courseIds.length} courses)`,
        () => exportCourseLessons(courseIds));
    } catch {
      lessonsByCourse = {};
    }
  }

  console.log(`\n  Exported: ${categories.length} categories, ${tags.length} tags, ${pages.length} pages, ${videos.length} videos, ${courses.length} courses, ${posts.length} posts, ${books.length} books, ${navItems.length} nav items, ${comments.length} comments`);

  // ── Always save the JSON export first (backup / standalone use) ──
  console.log("\n═══ Saving export data to JSON ═══");
  const exportDir = path.resolve(__dirname, "..", "strapi-migration-data");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const allData = {
    exportedAt: new Date().toISOString(),
    counts: {
      categories: categories.length, tags: tags.length, pages: pages.length,
      videos: videos.length, courses: courses.length, posts: posts.length,
      books: books.length, navItems: navItems.length, comments: comments.length,
      courseLessons: Object.values(lessonsByCourse).flat().length,
    },
    categories, tags, pages, videos, courses, courseLessons: lessonsByCourse,
    posts, books, contentCategories, contentTags,
    navigationItems: navItems, comments, siteSettings: siteSettingsRows,
  };
  const exportPath = path.join(exportDir, "migration-data.json");
  fs.writeFileSync(exportPath, JSON.stringify(allData, null, 2));
  console.log(`  ✅ Data exported to: ${exportPath}`);

  // ── Test Strapi connectivity before import ─────────────────────
  console.log("  Testing Strapi connection...");
  let strapiReachable = false;
  try {
    await strapiFetch("/categories?pagination[pageSize]=1");
    strapiReachable = true;
    console.log("  ✅ Strapi is reachable and authenticated");
  } catch (err) {
    console.log(`  ⚠  Strapi unreachable: ${err.message}`);
    console.log("");
    console.log("  To import into Strapi:");
    console.log("  1. Open Strapi Admin at http://localhost:1337/admin");
    console.log("  2. Go to Settings → API Tokens → Create new API Token (Full access)");
    console.log("  3. Add to .env:  STRAPI_API_TOKEN=your-token");
    console.log("  4. Run:  node scripts/migrate-to-strapi.mjs");
    console.log("");
    return;
  }

  // ── STEP 2: Import into Strapi ─────────────────────────────────
  console.log("\n═══ Step 2: Importing into Strapi ═══");

  console.log("\n── Categories ──");
  const categoryIdMap = await importTaxonomy("categories", categories, toStrapiCategory);

  console.log("\n── Tags ──");
  const tagIdMap = await importTaxonomy("tags", tags, toStrapiTag);

  console.log("\n── Pages ──");
  await importContent("pages", pages, toStrapiPage);

  console.log("\n── Videos ──");
  await importContent("videos", videos, toStrapiVideo);

  console.log("\n── Courses ──");
  await importContent("courses", courses, (r) => toStrapiCourse(r, lessonsByCourse[r.id]));

  console.log("\n── Posts ──");
  const postMap = await importContent("posts", posts, toStrapiPost);

  console.log("\n── Books ──");
  const bookMap = await importContent("books", books, toStrapiBook);

  // Resolve junction table relations
  console.log("\n── Resolving category/tag relations via junction tables ──");

  async function resolveJunction(junctions, targetType, field, strapiIdMap, contentMap) {
    let resolved = 0, failed = 0;
    for (const j of junctions) {
      const relId = strapiIdMap[j[field === "categories" ? "category_id" : "tag_id"]];
      const docId = contentMap[j.content_id];
      if (!relId || !docId) continue;
      try {
        await strapiFetch(`/${targetType}/${docId}`, {
          method: "PUT", body: { data: { [field]: { connect: [{ id: relId }] } } },
        });
        resolved++;
      } catch { failed++; }
    }
    return { resolved, failed };
  }

  const results = await Promise.all([
    resolveJunction(contentCategories.filter((j) => j.content_type === "post"), "posts", "categories", categoryIdMap, postMap),
    resolveJunction(contentCategories.filter((j) => j.content_type === "book"), "books", "categories", categoryIdMap, bookMap),
    resolveJunction(contentTags.filter((j) => j.content_type === "post"), "posts", "tags", tagIdMap, postMap),
    resolveJunction(contentTags.filter((j) => j.content_type === "book"), "books", "tags", tagIdMap, bookMap),
  ]);

  const totalResolved = results.reduce((s, r) => s + r.resolved, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  if (totalResolved > 0) {
    console.log(`    ${totalResolved} relations resolved (${totalFailed} failed)`);
  } else {
    console.log("    No relations to resolve");
  }

  console.log("\n── Navigation ──");
  await importNavigation(navItems);

  console.log("\n── Comments ──");
  await importComments(comments);

  console.log("\n── Site Settings ──");
  await importSiteSettings(siteSettingsRows);

  // ── STEP 3: Summary ────────────────────────────────────────────
  console.log("\n═══ Migration Complete ═══\n");
  let tc = 0, ts = 0;
  for (const [type, s] of Object.entries(stats)) {
    console.log(`  ${type.padEnd(15)}  ${String(s.created).padStart(3)} created, ${String(s.skipped).padStart(3)} skipped`);
    tc += s.created; ts += s.skipped;
  }
  console.log(`\n  Total: ${tc} created, ${ts} skipped`);

  if (tc > 0) {
    console.log("\n  ✅ Data migrated!");
    console.log("  ▶  Access Strapi admin: http://localhost:1337/admin");
    console.log("\n  Note: cover images/PDFs not migrated (require file upload).");
    console.log("  Use Strapi's media library for files.");
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n  Migration failed:", err.message);
  process.exit(1);
});
