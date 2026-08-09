#!/usr/bin/env node
/**
 * AD-027 — Strapi → Supabase Books Mirror (one-way sync)
 * ======================================================
 *
 * Strapi is the editorial source of truth for books (title, cover,
 * description, category, featured). This script mirrors ONLY the fields the
 * frontend needs from Supabase (grids / cart / checkout / library) into the
 * existing Supabase `books` table — idempotently, one-way, no dual-write.
 *
 * USAGE:
 *   node scripts/sync-strapi-books.mjs                       # full sync
 *   node scripts/sync-strapi-books.mjs --dry-run             # fetch, print plan, no writes
 *   node scripts/sync-strapi-books.mjs --from-json books.json --dry-run
 *                                                            # test mapping without live Strapi
 *   node scripts/sync-strapi-books.mjs --self-test           # offline mapping self-check (exit 0/1)
 *   node scripts/sync-strapi-books.mjs --no-archive          # don't archive Strapi-absent books
 *   node scripts/sync-strapi-books.mjs --limit 5             # only first N published books
 *
 * ENV (from .env — all optional except when their phase runs):
 *   VITE_STRAPI_URL / STRAPI_URL                 — Strapi base URL
 *   VITE_STRAPI_API_TOKEN / STRAPI_API_TOKEN     — Strapi read token (read-only is enough)
 *   SUPABASE_URL / VITE_SUPABASE_URL             — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY                    — Supabase service role key (server-side only)
 *
 * MIRROR SEMANTICS:
 *   - Upsert on `slug` (resolution: merge-duplicates) — repeatable, no duplicates.
 *   - Columns NOT in MIRRORED_COLUMNS (id, pages, isbn, timestamps, ratings
 *     bookmarks, etc.) are preserved on conflict and defaulted on insert.
 *   - Books published in Strapi but missing from the source on a run are
 *     archived in Supabase (status = 'archived'), never deleted. Use
 *     --no-archive to skip.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ═══════════════════════════════════════════════════════════════════════════
 * PURE HELPERS (exported for unit tests)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Strip a Strapi v5 "blocks" document (or a plain string / legacy shape) down
 * to readable plain text. Paragraph/heading blocks join with blank lines,
 * list items join with newlines.
 */
export function blocksToText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;

  const line = (node) => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node.children)) return node.children.map(line).join("");
    if (Array.isArray(node)) return node.map(line).join("");
    if (typeof node.text === "string") return node.text;
    return "";
  };

  const parts = content.map((block) => {
    const text = line(block);
    if (block.type === "list") {
      const items = (block.children || []).map((item) => line(item)).filter(Boolean);
      return items.join("\n");
    }
    return text;
  });

  return parts.filter(Boolean).join("\n\n").trim();
}

/** Absolute URL for a Strapi media object (or "" when absent). */
export function mediaUrl(media, strapiUrl) {
  if (!media?.url) return "";
  if (/^https?:\/\//.test(media.url)) return media.url;
  const base = (strapiUrl || "").replace(/\/$/, "");
  return `${base}${media.url}`;
}

/**
 * Columns the mirror is allowed to write. Everything else in the Supabase
 * `books` row (id, pages, isbn, timestamps, etc.) is left untouched.
 */
export const MIRRORED_COLUMNS = [
  "slug",
  "title_en",
  "title_bn",
  "author_name",
  "description_en",
  "description_bn",
  "cover_image",
  "pdf_url",
  "pdf_file_size",
  "price",
  "is_free",
  "status",
  "featured",
  "tags",
  "category",
  "meta_description_en",
  "meta_description_bn",
  "sort_order",
  "avg_rating",
  "total_ratings",
];

/**
 * Map a Strapi Book entry (as returned by /api/books?populate=*) into a
 * Supabase `books` row containing only MIRRORED_COLUMNS.
 */
export function mapStrapiBook(strapiBook, strapiUrl) {
  const b = strapiBook || {};
  const row = {
    slug: b.slug,
    title_en: b.title_en ?? "",
    title_bn: b.title_bn ?? "",
    author_name: b.author_name ?? "",
    description_en: blocksToText(b.description_en),
    description_bn: blocksToText(b.description_bn),
    cover_image: mediaUrl(b.cover_image, strapiUrl),
    pdf_url: mediaUrl(b.pdf_file, strapiUrl),
    pdf_file_size: b.pdf_file?.size ?? 0,
    price: Number(b.price ?? 0),
    is_free: Boolean(b.is_free ?? true),
    status: b.book_status ?? "draft",
    featured: Boolean(b.featured ?? false),
    tags: (b.tags || []).map((t) => t.slug || String(t.name_en || "").toLowerCase()).filter(Boolean),
    sort_order: b.sort_order ?? 0,
    avg_rating: Number(b.rating ?? 0),
    total_ratings: Number(b.rating_count ?? 0),
  };

  // Category: first related category's slug (canonical, matches the taxonomy
  // slugs used by /reflections routes). NOTE: the Supabase books adapter
  // filters `.eq("category", options.category)` — verify at P1 hookup that the
  // frontend passes category SLUGS (the mock used display names).
  const cat = b.categories?.[0];
  if (cat) row.category = cat.slug || String(cat.name_en || "").toLowerCase();
  // Omit when absent so the DB default ('general') applies on insert and the
  // existing value is preserved on conflict.

  // Strapi has a single seo_description (no per-locale bn variant), so only
  // meta_description_en is mirrored; meta_description_bn stays ''/preserved.
  if (b.seo_description) row.meta_description_en = b.seo_description;

  return row;
}

/** Normalize a Strapi REST response ({ data: [...] }) into a plain array. */
export function extractStrapiBooks(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * RUNTIME (env loading + orchestration)
 * ═══════════════════════════════════════════════════════════════════════════ */

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return; // env may come from the shell instead
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

function parseArgs(argv) {
  const flags = {
    dryRun: argv.includes("--dry-run"),
    noArchive: argv.includes("--no-archive"),
    selfTest: argv.includes("--self-test"),
    limit: null,
    fromJson: null,
  };
  const limitIdx = argv.indexOf("--limit");
  if (limitIdx !== -1 && argv[limitIdx + 1]) {
    flags.limit = Number.parseInt(argv[limitIdx + 1], 10);
  }
  const jsonIdx = argv.indexOf("--from-json");
  if (jsonIdx !== -1 && argv[jsonIdx + 1]) {
    flags.fromJson = path.resolve(__dirname, "..", argv[jsonIdx + 1]);
  }
  return flags;
}

function env(name) {
  return process.env[name] || process.env[name.replace(/^VITE_/, "")] || "";
}

/** Fetch all published books from Strapi, page by page. */
async function fetchStrapiBooks(strapiUrl, token) {
  const all = [];
  const pageSize = 100;
  let page = 1;
  for (;;) {
    const url = `${strapiUrl}/api/books?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=sort_order:asc&populate[cover_image]=*&populate[pdf_file]=*&populate[categories]=*&populate[tags]=*`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Strapi GET /api/books failed: ${res.status} ${res.statusText}`);
    }
    const payload = await res.json();
    const batch = extractStrapiBooks(payload);
    all.push(...batch);
    if (!payload?.meta?.pagination) {
      console.warn(`  Warning: response for page ${page} has no meta.pagination — assuming single page.`);
    }
    const total = payload?.meta?.pagination?.total ?? batch.length;
    const pageCount = payload?.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount || batch.length === 0 || all.length >= total) break;
    page += 1;
  }
  return all;
}

/** Offline mapping self-check — exit code 0/1. Runs with no network or env. */
export function selfTest() {
  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`  ✗ ${msg}`);
      return false;
    }
    console.log(`  ✓ ${msg}`);
    return true;
  };

  const strapiUrl = "http://localhost:1337";
  const fixture = {
    slug: "the-heart-of-meditation",
    title_en: "The Heart of Meditation",
    title_bn: "ধ্যানের হৃদয়",
    description_en: [
      { type: "heading", level: 2, children: [{ type: "text", text: "A guide" }] },
      { type: "paragraph", children: [{ type: "text", text: "Covers breath awareness." }] },
      { type: "list", format: "unordered", children: [{ type: "list-item", children: [{ type: "text", text: "Item A" }] }] },
    ],
    cover_image: { url: "/uploads/cover-1.jpg" },
    pdf_file: { url: "/uploads/book-1.pdf", size: 862 },
    price: "0",
    is_free: true,
    book_status: "published",
    featured: true,
    categories: [{ slug: "meditation" }],
    tags: [{ slug: "mindfulness" }, { name_en: "Buddhism" }],
    sort_order: 0,
    rating: "4.5",
    rating_count: 128,
  };

  const ok = [];
  ok.push(assert(blocksToText("plain") === "plain", "blocksToText handles plain strings"));
  ok.push(
    assert(
      blocksToText(fixture.description_en).includes("Covers breath awareness.") &&
        blocksToText(fixture.description_en).includes("Item A"),
      "blocksToText flattens Strapi blocks + lists",
    ),
  );
  ok.push(
    assert(mediaUrl({ url: "/uploads/x.jpg" }, strapiUrl) === `${strapiUrl}/uploads/x.jpg`, "mediaUrl absolutizes relative paths"),
  );
  ok.push(assert(mediaUrl(null, strapiUrl) === "", "mediaUrl returns '' when absent"));

  const row = mapStrapiBook(fixture, strapiUrl);
  ok.push(assert(row.slug === "the-heart-of-meditation", "slug mapped"));
  ok.push(assert(row.pdf_url === `${strapiUrl}/uploads/book-1.pdf` && row.pdf_file_size === 862, "pdf reference + size mapped"));
  ok.push(assert(row.is_free === true && row.price === 0, "commerce fields mapped"));
  ok.push(assert(row.category === "meditation", "category from first relation slug"));
  ok.push(
    assert(JSON.stringify(row.tags) === JSON.stringify(["mindfulness", "buddhism"]), "tags mapped to slugs"),
  );
  ok.push(assert(row.status === "published" && row.featured === true, "status + featured mapped"));
  ok.push(assert(row.avg_rating === 4.5 && row.total_ratings === 128, "rating fields mapped"));

  const noCat = mapStrapiBook({ slug: "x", title_en: "X" }, strapiUrl);
  ok.push(assert(!("category" in noCat), "category omitted when no relation (DB default applies)"));
  ok.push(assert(!("pages" in row) && !("isbn" in row) && !("id" in row), "non-mirrored columns excluded"));
  ok.push(
    assert(MIRRORED_COLUMNS.includes("price") && MIRRORED_COLUMNS.includes("is_free") && MIRRORED_COLUMNS.includes("slug"), "column allowlist present"),
  );
  ok.push(
    assert(extractStrapiBooks({ data: [{ slug: "a" }] }).length === 1 && extractStrapiBooks([{ slug: "a" }]).length === 1, "extractStrapiBooks normalizes payloads"),
  );

  const failures = ok.filter((v) => v === false).length;
  if (failures > 0) {
    console.error(`\nSelf-test FAILED (${failures} assertion(s)).`);
    process.exit(1);
  }
  console.log("\nSelf-test passed — mapping contract is intact.");
  process.exit(0);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  loadEnv();

  if (flags.selfTest) return selfTest();

  const strapiUrl = (env("VITE_STRAPI_URL") || "http://localhost:1337").replace(/\/$/, "");
  const strapiToken = env("VITE_STRAPI_API_TOKEN");
  const supabaseUrl = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const supabaseKey = env("SUPABASE_SERVICE_ROLE_KEY");

  // ── 1. Get source books (live Strapi, or a local JSON file for testing) ──
  let strapiBooks;
  if (flags.fromJson) {
    strapiBooks = extractStrapiBooks(JSON.parse(fs.readFileSync(flags.fromJson, "utf8")));
    console.log(`Loaded ${strapiBooks.length} books from ${flags.fromJson}`);
  } else {
    if (!strapiToken) {
      console.error("Missing Strapi token. Set VITE_STRAPI_API_TOKEN (or use --from-json).");
      process.exit(1);
    }
    console.log(`Fetching published books from ${strapiUrl}/api/books …`);
    strapiBooks = await fetchStrapiBooks(strapiUrl, strapiToken);
  }

  const published = strapiBooks.filter((b) => !b.book_status || b.book_status === "published");
  let rows = published.map((b) => mapStrapiBook(b, strapiUrl));
  if (flags.limit) rows = rows.slice(0, flags.limit);

  console.log(`Mapping ${rows.length} published book(s) → ${MIRRORED_COLUMNS.length} mirrored columns.`);

  // ── 2. Dry run stops here ──
  if (flags.dryRun) {
    for (const r of rows) {
      console.log(`  [plan] ${r.slug} · ${r.title_en} · ${r.is_free ? "free" : `BDT ${r.price}`} · ${r.status}`);
    }
    console.log("\nDry run — nothing written.");
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for the write phase.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 3. Upsert on slug (merge-duplicates) ──
  let upserted = 0;
  let errors = 0;
  for (const row of rows) {
    const { error } = await supabase.from("books").upsert(row, { onConflict: "slug" });
    if (error) {
      console.error(`  ✗ ${row.slug}: ${error.message}`);
      errors += 1;
      continue;
    }
    upserted += 1;
    console.log(`  ✓ ${row.slug}`);
  }

  // ── 4. Archive books that disappeared from the Strapi source ──
  let archived = 0;
  if (!flags.noArchive && !flags.limit) {
    const mirroredSlugs = new Set(rows.map((r) => r.slug));
    const { data: existing, error: listErr } = await supabase
      .from("books")
      .select("slug")
      .neq("status", "archived");
    if (listErr) {
      console.error(`  Could not list existing books for archiving: ${listErr.message}`);
    } else {
      const stale = (existing || []).filter((b) => !mirroredSlugs.has(b.slug));
      if (stale.length > 0) {
        const { error } = await supabase
          .from("books")
          .update({ status: "archived" })
          .in("slug", stale.map((b) => b.slug));
        if (error) {
          console.error(`  ✗ archive batch: ${error.message}`);
          errors += 1;
        } else {
          archived = stale.length;
          console.log(`  ↳ archived ${archived} book(s): ${stale.map((b) => b.slug).join(", ")}`);
        }
      }
    }
  }

  console.log(`\nDone. ${upserted} upserted, ${archived} archived, ${errors} error(s).`);
}

// Only run the sync when executed directly — importing the module (e.g. for
// unit tests) must not trigger a sync or process.exit.
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
}
