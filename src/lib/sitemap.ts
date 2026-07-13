import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://bodhimitra.com";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export const generateSitemap = createServerFn({ method: "GET" }).handler(async () => {
  const db = supabase as any;
  const entries: SitemapEntry[] = [];

  // Static pages
  const staticPages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/books", changefreq: "weekly", priority: "0.8" },
    { loc: "/videos", changefreq: "weekly", priority: "0.7" },
    { loc: "/contact", changefreq: "monthly", priority: "0.5" },
  ];
  for (const p of staticPages) {
    entries.push({ ...p, lastmod: new Date().toISOString() });
  }

  // Published posts
  const { data: posts } = await db
    .from("posts")
    .select("slug, created_at, updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (posts) {
    for (const p of posts) {
      entries.push({
        loc: `/posts/${p.slug}`,
        lastmod: p.updated_at || p.created_at,
        changefreq: "monthly",
        priority: "0.7",
      });
    }
  }

  // Visible pages
  const { data: pages } = await db
    .from("pages")
    .select("slug, created_at, updated_at")
    .eq("visible", true)
    .order("created_at", { ascending: false });
  if (pages) {
    for (const p of pages) {
      entries.push({
        loc: p.slug === "home" ? "/" : `/${p.slug}`,
        lastmod: p.updated_at || p.created_at,
        changefreq: "monthly",
        priority: "0.6",
      });
    }
  }

  // Published books
  const { data: books } = await db
    .from("books")
    .select("slug, created_at, updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (books) {
    for (const b of books) {
      entries.push({
        loc: `/books/${b.slug}`,
        lastmod: b.updated_at || b.created_at,
        changefreq: "monthly",
        priority: "0.8",
      });
    }
  }

  // Videos
  const { data: videos } = await db
    .from("videos")
    .select("created_at, updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (videos) {
    for (const v of videos) {
      entries.push({
        loc: "/videos",
        lastmod: v.updated_at || v.created_at,
        changefreq: "weekly",
        priority: "0.6",
      });
    }
  }

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${BASE_URL}${e.loc}</loc>
    <lastmod>${new Date(e.lastmod || Date.now()).toISOString().split("T")[0]}</lastmod>
    <changefreq>${e.changefreq || "monthly"}</changefreq>
    <priority>${e.priority || "0.5"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return xml;
});
