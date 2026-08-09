/**
 * Server-only SEO helpers (sitemap + robots.txt).
 *
 * This file is `.server.ts` — the TanStack Start import-protection plugin
 * denies any client bundle from importing it, which guarantees the
 * `supabaseAdmin` client below can never leak into client code. It is only
 * imported by src/server.ts.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Check if sitemap generation is enabled in site settings */
export async function isSitemapEnabled(): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("config")
      .eq("id", true)
      .maybeSingle();
    const config = data?.config as Record<string, any> | null;
    return config?.seo?.enable_sitemap !== false;
  } catch {
    return true;
  }
}

/** Generate sitemap XML for server-side interception */
export async function generateSitemapXml(baseUrl: string): Promise<string> {
  const entries: Array<{ loc: string; lastmod?: string; changefreq: string; priority: number }> = [];

  const staticPages = [
    { loc: "/", changefreq: "daily" as const, priority: 1.0 },
    { loc: "/about", changefreq: "monthly" as const, priority: 0.7 },
    { loc: "/reflections", changefreq: "weekly" as const, priority: 0.8 },
    { loc: "/books", changefreq: "weekly" as const, priority: 0.7 },
    { loc: "/videos", changefreq: "weekly" as const, priority: 0.6 },
    { loc: "/donate", changefreq: "monthly" as const, priority: 0.5 },
    { loc: "/faq", changefreq: "monthly" as const, priority: 0.5 },
    { loc: "/contact", changefreq: "monthly" as const, priority: 0.5 },
    { loc: "/terms", changefreq: "yearly" as const, priority: 0.3 },
    { loc: "/privacy", changefreq: "yearly" as const, priority: 0.3 },
  ];
  entries.push(...staticPages);

  try {
    const { data: posts } = await supabaseAdmin
      .from("posts").select("slug, updated_at, created_at").eq("status", "published");
    if (posts) for (const p of posts) entries.push({ loc: `/posts/${p.slug}`, lastmod: p.updated_at || p.created_at, changefreq: "monthly", priority: 0.7 });
  } catch {}

  try {
    const { data: books } = await supabaseAdmin
      .from("books").select("slug, updated_at, created_at").eq("status", "published");
    if (books) for (const b of books) entries.push({ loc: `/books/${b.slug}`, lastmod: b.updated_at || b.created_at, changefreq: "monthly", priority: 0.8 });
  } catch {}

  try {
    const { data: pages } = await supabaseAdmin
      .from("pages").select("slug, updated_at, created_at").eq("visible", true);
    if (pages) for (const p of pages) entries.push({ loc: `/pages/${p.slug}`, lastmod: p.updated_at || p.created_at, changefreq: "monthly", priority: 0.6 });
  } catch {}

  try {
    const { data: categories } = await supabaseAdmin
      .from("categories").select("slug, updated_at").eq("visible", true);
    if (categories) for (const c of categories) entries.push({ loc: `/reflections/${c.slug}`, lastmod: c.updated_at || undefined, changefreq: "weekly", priority: 0.7 });
  } catch {}

  try {
    const { data: videos } = await supabaseAdmin
      .from("videos").select("id, title, updated_at, created_at").eq("status", "published");
    if (videos) for (const v of videos) entries.push({ loc: `/videos`, lastmod: v.updated_at || v.created_at, changefreq: "weekly", priority: 0.6 });
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${escapeXml(baseUrl + e.loc)}</loc>
    ${e.lastmod ? `<lastmod>${formatDate(e.lastmod)}</lastmod>` : ""}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`).join("\n")}
</urlset>`;
  return xml;
}

/** Generate robots.txt content for server-side interception */
export function generateRobotsTxt(baseUrl: string): string {
  return [
    `User-agent: *`,
    `Allow: /`,
    ``,
    `# Disallow admin, auth, and API pages`,
    `Disallow: /admin/`,
    `Disallow: /login`,
    `Disallow: /onboarding`,
    `Disallow: /api/`,
    `Disallow: /reset-password`,
    `Disallow: /forgot-password`,
    `Disallow: /settings`,
    `Disallow: /profile`,
    `Disallow: /wishlist`,
    `Disallow: /cart`,
    ``,
    `# Allow search engines to index public content`,
    `Allow: /reflections/`,
    `Allow: /books/`,
    `Allow: /videos`,
    `Allow: /search`,
    ``,
    `# Sitemap`,
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ``,
  ].join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}
