import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export interface TrendingItem {
  type: "post" | "book" | "course";
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  url: string;
  thumbnail: string | null;
  viewCount: number;
  created_at: string;
}

const db = supabase as any;

/** Get trending content (most viewed) */
export const getTrendingContent = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { limit?: number; days?: number };
    const limit = input.limit || 10;
    const days = input.days || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const results: TrendingItem[] = [];

    // Trending posts
    try {
      const { data: posts } = await db
        .from("posts")
        .select("id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, view_count, created_at")
        .eq("status", "published")
        .gte("created_at", since)
        .order("view_count", { ascending: false })
        .limit(limit);
      if (posts) {
        for (const p of posts) {
          results.push({
            type: "post",
            id: p.id,
            slug: p.slug,
            title: p.title_en || p.title_bn || "",
            excerpt: p.excerpt_en || p.excerpt_bn || "",
            url: `/posts/${p.slug}`,
            thumbnail: p.cover_image,
            viewCount: p.view_count || 0,
            created_at: p.created_at,
          });
        }
      }
    } catch { /* silent */ }

    // Trending books
    try {
      const { data: books } = await db
        .from("books")
        .select("id, slug, title_en, title_bn, description_en, description_bn, cover_image, view_count, created_at")
        .eq("status", "published")
        .gte("created_at", since)
        .order("view_count", { ascending: false })
        .limit(limit);
      if (books) {
        for (const b of books) {
          results.push({
            type: "book",
            id: b.id,
            slug: b.slug,
            title: b.title_en || b.title_bn || "",
            excerpt: b.description_en || b.description_bn || "",
            url: `/books/${b.slug}`,
            thumbnail: b.cover_image,
            viewCount: b.view_count || 0,
            created_at: b.created_at,
          });
        }
      }
    } catch { /* silent */ }

    // Trending courses
    try {
      const { data: courses } = await db
        .from("courses")
        .select("id, slug, title_en, title_bn, description_en, description_bn, cover_image, view_count, created_at")
        .eq("published", true)
        .gte("created_at", since)
        .order("view_count", { ascending: false })
        .limit(limit);
      if (courses) {
        for (const c of courses) {
          results.push({
            type: "course",
            id: c.id,
            slug: c.slug,
            title: c.title_en || c.title_bn || "",
            excerpt: c.description_en || c.description_bn || "",
            url: `/courses/${c.slug}`,
            thumbnail: c.cover_image,
            viewCount: c.view_count || 0,
            created_at: c.created_at,
          });
        }
      }
    } catch { /* silent */ }

    // Sort by view count and take top N
    results.sort((a, b) => b.viewCount - a.viewCount);
    return results.slice(0, limit);
  },
);

/** Get recently added content */
export const getRecentlyAdded = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { limit?: number };
    const limit = input.limit || 10;
    const results: TrendingItem[] = [];

    // Recent posts
    try {
      const { data: posts } = await db
        .from("posts")
        .select("id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (posts) {
        for (const p of posts) {
          results.push({
            type: "post",
            id: p.id,
            slug: p.slug,
            title: p.title_en || p.title_bn || "",
            excerpt: p.excerpt_en || p.excerpt_bn || "",
            url: `/posts/${p.slug}`,
            thumbnail: p.cover_image,
            viewCount: 0,
            created_at: p.created_at,
          });
        }
      }
    } catch { /* silent */ }

    // Recent books
    try {
      const { data: books } = await db
        .from("books")
        .select("id, slug, title_en, title_bn, description_en, description_bn, cover_image, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (books) {
        for (const b of books) {
          results.push({
            type: "book",
            id: b.id,
            slug: b.slug,
            title: b.title_en || b.title_bn || "",
            excerpt: b.description_en || b.description_bn || "",
            url: `/books/${b.slug}`,
            thumbnail: b.cover_image,
            viewCount: 0,
            created_at: b.created_at,
          });
        }
      }
    } catch { /* silent */ }

    // Sort by created_at and take top N
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return results.slice(0, limit);
  },
);

/** Increment view count for a content item */
export async function incrementViewCount(
  table: string,
  id: string,
): Promise<void> {
  try {
    await db.rpc("increment_view_count" as any, { table_name: table, item_id: id }).then(() => {});
  } catch {
    // Fallback: direct increment
    try {
      const { data: item } = await db.from(table).select("view_count").eq("id", id).single();
      if (item) {
        await db.from(table).update({ view_count: (item.view_count || 0) + 1 }).eq("id", id);
      }
    } catch { /* silent */ }
  }
}
