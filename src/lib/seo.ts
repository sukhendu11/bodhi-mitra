import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ─── Check if sitemap generation is enabled ──────────────────── */

/** Fetch site settings and check if the sitemap toggle is on. Defaults to true on error. */
export async function isSitemapEnabled(): Promise<boolean> {
  try {
    const { data } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("config")
      .eq("id", true)
      .maybeSingle();
    return data?.config?.seo?.enable_sitemap !== false;
  } catch (e) {
    console.error("[sitemap] Failed to check sitemap setting:", e);
    return true; // Default to enabled on error
  }
}

/* ─── Static URLs that are always present ───────────────────────── */

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/buddhist-psychology", changefreq: "weekly", priority: 0.9 },
  { path: "/wisdom", changefreq: "weekly", priority: 0.8 },
  { path: "/satsang", changefreq: "weekly", priority: 0.8 },
  { path: "/about", changefreq: "monthly", priority: 0.7 },
  { path: "/contact", changefreq: "monthly", priority: 0.6 },
  { path: "/books", changefreq: "weekly", priority: 0.6 },
] as const;

/* ─── XML helpers ───────────────────────────────────────────────── */

function xmlUrl({ loc, lastmod, changefreq, priority }: {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}): string {
  const parts = [`    <url>`, `      <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`      <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`      <changefreq>${changefreq}</changefreq>`);
  if (priority !== undefined) parts.push(`      <priority>${priority.toFixed(1)}</priority>`);
  parts.push(`    </url>`);
  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(iso: string | null | undefined): string {
  // Extract YYYY-MM-DD from ISO date string
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

/* ─── Generate sitemap XML ──────────────────────────────────────── */

export async function generateSitemapXml(baseUrl: string): Promise<string> {
  const urls: string[] = [];

  // Static routes
  for (const route of STATIC_ROUTES) {
    urls.push(
      xmlUrl({
        loc: `${baseUrl}${route.path}`,
        changefreq: route.changefreq,
        priority: route.priority,
      }),
    );
  }

  // Published posts
  try {
    const { data: posts } = await (supabaseAdmin as any)
      .from("posts")
      .select("slug, updated_at, created_at")
      .eq("status", "published");
    if (posts) {
      for (const post of posts) {
        urls.push(
          xmlUrl({
            loc: `${baseUrl}/posts/${post.slug}`,
            lastmod: formatDate(post.updated_at || post.created_at),
            changefreq: "monthly",
            priority: 0.6,
          }),
        );
      }
    }
  } catch (e) {
    console.error("[sitemap] Failed to fetch posts:", e);
  }

  // Published books (each gets its own page on the books grid via anchor)
  try {
    const { data: books } = await (supabaseAdmin as any)
      .from("books")
      .select("slug, updated_at, created_at")
      .eq("status", "published");
    if (books) {
      for (const book of books) {
        urls.push(
          xmlUrl({
            loc: `${baseUrl}/books#${book.slug}`,
            lastmod: formatDate(book.updated_at || book.created_at),
            changefreq: "monthly",
            priority: 0.5,
          }),
        );
      }
    }
  } catch (e) {
    console.error("[sitemap] Failed to fetch books:", e);
  }

  // Visible pages from the pages table
  try {
    const { data: pages } = await (supabaseAdmin as any)
      .from("pages")
      .select("slug, updated_at, created_at")
      .eq("visible", true);
    if (pages) {
      for (const page of pages) {
        urls.push(
          xmlUrl({
            loc: `${baseUrl}/${page.slug}`,
            lastmod: formatDate(page.updated_at || page.created_at),
            changefreq: "monthly",
            priority: 0.7,
          }),
        );
      }
    }
  } catch (e) {
    console.error("[sitemap] Failed to fetch pages:", e);
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urls.join("\n"),
    `</urlset>`,
  ].join("\n");
}

/* ─── Generate robots.txt ───────────────────────────────────────── */

export function generateRobotsTxt(baseUrl: string): string {
  return [
    `User-agent: *`,
    `Allow: /`,
    ``,
    `# Disallow admin and auth pages`,
    `Disallow: /admin/`,
    `Disallow: /login`,
    `Disallow: /onboarding`,
    `Disallow: /api/`,
    ``,
    `# Sitemap`,
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ``,
  ].join("\n");
}
