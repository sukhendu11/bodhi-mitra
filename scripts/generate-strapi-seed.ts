/**
 * Generate an importable Strapi seed bundle from the CURRENT mock content.
 *
 * The frontend renders from mock data (src/lib/mock-data.ts). This script
 * transforms that content into Strapi-shaped JSON (fields named per the Strapi
 * content-type schema files in strapi/src/api) and writes
 * strapi/seed/strapi-content-bundle.json — the single file the user imports
 * into the FRESH Strapi instance via scripts/import-strapi-seed.mjs.
 *
 * Usage:
 *   npx tsx scripts/generate-strapi-seed.ts
 *
 * Re-run whenever mock content changes. Deterministic ordering; local mock-CMS
 * overrides (admin edits) are cleared first so the bundle is always the base data.
 *
 * Pure mapping helpers are exported for unit tests (scripts/generate-strapi-seed.test.ts).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  mockFetchAllBooks,
  mockFetchAllPosts,
  mockFetchAllVideos,
  mockFetchCategories,
  mockFetchPages,
  mockFetchPublicNavItems,
} from "../src/lib/mock-data";
import { mockClearCms } from "../src/lib/mock-cms";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, "..", "strapi", "seed", "strapi-content-bundle.json");
const SETTINGS_PATH = path.resolve(__dirname, "..", "strapi", "scripts", "seed-settings.json");

/* ─── Pure helpers (exported for tests) ─────────────────────────── */

/** "Four Noble Truths" → "four-noble-truths" */
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Plain text → Strapi v5 blocks document (paragraphs split on blank lines). */
export function textToBlocks(text: string | null | undefined): unknown[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: "paragraph", children: [{ type: "text", text: p }] }));
}

const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  "Meditation": "meditation",
  "Mindfulness": "mindfulness",
  "Mental Health": "mental-health",
  "Philosophy": "philosophy",
  "Buddhist Psychology": "buddhist-psychology",
};

export function categoryNameToSlug(name: string): string {
  return CATEGORY_NAME_TO_SLUG[name] || slugify(name);
}

/* ─── Mappers (mock row → Strapi payload) ───────────────────────── */

export function mapMockCategory(cat: any) {
  return {
    name_en: cat.name_en,
    name_bn: cat.name_bn ?? "",
    slug: cat.slug,
    description_en: cat.description_en ?? "",
    description_bn: cat.description_bn ?? "",
    color: cat.color ?? "#6B7280",
    visible: cat.visible ?? true,
    sort_order: cat.sort_order ?? 0,
  };
}

// NOTE: no sort_order — the Strapi Tag schema has no such field.
export function mapMockTag(word: string) {
  const slug = slugify(word);
  return {
    name_en: word
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    name_bn: "",
    slug,
    color: "#6B7280",
  };
}

export function mapMockBook(book: any) {
  return {
    title_en: book.title_en ?? book.title ?? "",
    title_bn: book.title_bn ?? "",
    slug: book.slug,
    description_en: textToBlocks(book.description_en),
    description_bn: textToBlocks(book.description_bn),
    author_name: book.author_name ?? "",
    price: Number(book.price ?? 0),
    currency: "BDT", // BDT currency standard (2026-08-08)
    is_free: Boolean(book.is_free ?? true),
    book_status: book.status === "draft" ? "draft" : "published",
    rating: Number(book.avg_rating ?? 0),
    rating_count: Number(book.total_ratings ?? 0),
    featured: Boolean(book.featured ?? false),
    sort_order: book.sort_order ?? 0,
    categories: book.category ? [categoryNameToSlug(book.category)] : [],
    tags: (book.tags || []).map((t: string) => slugify(t)),
    seo_description: book.meta_description_en ?? "",
    // Import reference metadata (NOT Strapi fields — used by the importer):
    cover_image_url: book.cover_image ?? "",
    pdf_local_path: book.pdf_url && book.pdf_url.startsWith("/pdfs/") ? book.pdf_url : "",
  };
}

export function mapMockPost(post: any, index: number) {
  return {
    title_en: post.title_en ?? post.title ?? "",
    title_bn: post.title_bn ?? "",
    slug: post.slug,
    content_en: textToBlocks(post.content_en ?? post.content),
    content_bn: textToBlocks(post.content_bn ?? post.content_en ?? post.content),
    excerpt_en: post.excerpt_en ?? post.excerpt ?? "",
    excerpt_bn: post.excerpt_bn ?? "",
    author: post.author_name ?? "",
    reading_time: Math.max(1, Math.round((post.content_en || "").split(/\s+/).length / 200)),
    featured: Boolean(post.featured ?? false),
    sort_order: index,
    categories: post.category ? [categoryNameToSlug(post.category)] : [],
    tags: (post.tags || []).map((t: string) => slugify(t)),
    seo_description: post.meta_description_en ?? "",
    // Import reference metadata:
    cover_image_url: post.cover_image ?? "",
  };
}

export function mapMockVideo(video: any, index: number) {
  return {
    title_en: video.title_en ?? video.title ?? "",
    title_bn: video.title_bn ?? "",
    slug: video.slug ?? slugify(video.title_en ?? video.title ?? `video-${index + 1}`),
    description_en: video.description_en ?? video.description ?? "",
    description_bn: video.description_bn ?? "",
    embed_url: video.youtube_url ?? "",
    duration: Number(video.duration ?? 0),
    sort_order: video.sort_order ?? index,
    // Import reference metadata:
    thumbnail_url: video.thumbnail_url ?? "",
  };
}

export function mapMockPage(page: any) {
  return {
    title_en: page.title_en ?? "",
    title_bn: page.title_bn ?? "",
    slug: page.slug,
    content_en: textToBlocks([page.header_en, page.body_en].filter(Boolean).join("\n\n")),
    content_bn: textToBlocks([page.header_bn, page.body_bn].filter(Boolean).join("\n\n")),
    visible: page.visible ?? true,
    sort_order: page.sort_order ?? 0,
    seo_title: page.title_en ?? "",
    seo_description: page.meta_description_en ?? "",
  };
}

/** Flat root navigation only (simplified header: no dropdown children). */
export function mapMockNav(item: any) {
  return {
    title_en: item.label_en ?? "",
    title_bn: item.label_bn ?? "",
    url: item.url ?? "/",
    type: "internal" as const,
    location: "header" as const,
    visible: item.visible ?? true,
    sort_order: item.sort_order ?? 0,
  };
}

export function deriveSiteSettings(config: any) {
  const branding = config?.branding ?? {};
  const theme = config?.theme ?? {};
  const contact = config?.contact ?? {};
  const social = config?.social ?? {};
  const seo = config?.seo ?? {};
  return {
    site_name: branding.site_name_en || "Sabbe Satta",
    site_name_bn: branding.site_name_bn || "",
    site_tagline_en: branding.tagline_en || "",
    site_tagline_bn: branding.tagline_bn || "",
    accent_color: theme.accent_color || "#92400E",
    contact_email: contact.email || "",
    social_facebook: social.facebook || "",
    social_twitter: social.twitter || "",
    social_youtube: social.youtube || "",
    meta_title: seo?.meta_title || branding.site_name_en || "Sabbe Satta",
    meta_description: seo.meta_desc_en || "",
    config,
  };
}

/* ─── Bundle builder ─────────────────────────────────────────────── */

export function buildBundle() {
  mockClearCms();

  const categories = mockFetchCategories()
    .filter((c: any) => !c.parent_id) // root categories only (Strapi Category has no hierarchy)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(mapMockCategory);

  const posts = mockFetchAllPosts();
  const books = mockFetchAllBooks();
  const videos = mockFetchAllVideos();

  // Tags = union of all book tags (posts carry none in mock data)
  const tagWords = [...new Set(books.flatMap((b: any) => b.tags || []))].sort();
  const tags = tagWords.map(mapMockTag);

  const navigation = mockFetchPublicNavItems()
    .filter((n: any) => !n.parent_id)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(mapMockNav);

  const pages = mockFetchPages().map(mapMockPage);

  const siteSettingsRaw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  const siteSettings = deriveSiteSettings(siteSettingsRaw?.data?.config ?? siteSettingsRaw?.config ?? {});

  return {
    $comment:
      "Generated from the frontend mock content (src/lib/mock-data.ts) for the fresh Strapi instance. " +
      "Import with: node scripts/import-strapi-seed.mjs (see PROJECT.md §18 → Manual Setup Kit).",
    version: 1,
    generatedAt: new Date().toISOString(),
    categories,
    tags,
    navigation,
    pages,
    posts: posts.map(mapMockPost),
    books: books.map(mapMockBook),
    videos: videos.map(mapMockVideo),
    siteSettings,
  };
}

/* ─── Main (guarded so tests can import this module) ─────────────── */

async function main() {
  const bundle = buildBundle();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(bundle, null, 2), "utf8");
  const counts = {
    categories: bundle.categories.length,
    tags: bundle.tags.length,
    navigation: bundle.navigation.length,
    pages: bundle.pages.length,
    posts: bundle.posts.length,
    books: bundle.books.length,
    videos: bundle.videos.length,
  };
  console.log(`Wrote ${OUT_PATH}`);
  console.log("Counts:", JSON.stringify(counts));
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error("Generation failed:", err);
    process.exit(1);
  });
}
