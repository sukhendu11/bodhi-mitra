import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export type ContentType = "post" | "page" | "book" | "video";

export interface SearchResult {
  type: ContentType;
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  url: string;
  thumbnail: string | null;
  created_at: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export const searchContent = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { q: string; type?: ContentType; page?: number };
    const q = input.q || "";
    const type = input.type;
    const page = input.page || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const results: SearchResult[] = [];
    const db = supabase as any;
    const term = q.trim().replace(/[%_]/g, "");

    if (!term) return { results: [], total: 0 };

    if (!type || type === "post") {
      const { data: posts, error } = await db
        .from("posts")
        .select("id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, created_at")
        .eq("status", "published")
        .or(`title_en.ilike.*${term}*,title_bn.ilike.*${term}*,excerpt_en.ilike.*${term}*,excerpt_bn.ilike.*${term}*`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && posts) {
        for (const p of posts) {
          results.push({
            type: "post",
            id: p.id,
            slug: p.slug,
            title: p.title_en || p.title_bn || "",
            excerpt: p.excerpt_en || p.excerpt_bn || "",
            url: `/posts/${p.slug}`,
            thumbnail: p.cover_image,
            created_at: p.created_at,
          });
        }
      }
    }

    if (!type || type === "page") {
      const { data: pages, error } = await db
        .from("pages")
        .select("id, slug, title_en, title_bn, header_en, header_bn, body_en, body_bn, banner_url, created_at")
        .eq("visible", true)
        .or(`title_en.ilike.*${term}*,title_bn.ilike.*${term}*,header_en.ilike.*${term}*,header_bn.ilike.*${term}*`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && pages) {
        for (const p of pages) {
          results.push({
            type: "page",
            id: p.id,
            slug: p.slug,
            title: p.title_en || p.title_bn || "",
            excerpt: p.header_en || p.header_bn || p.body_en?.substring(0, 200) || p.body_bn?.substring(0, 200) || "",
            url: p.slug === "home" ? "/" : `/${p.slug}`,
            thumbnail: p.banner_url,
            created_at: p.created_at,
          });
        }
      }
    }

    if (!type || type === "book") {
      const { data: books, error } = await db
        .from("books")
        .select("id, slug, title_en, title_bn, description_en, description_bn, cover_image, author_name, created_at")
        .eq("status", "published")
        .or(`title_en.ilike.*${term}*,title_bn.ilike.*${term}*,description_en.ilike.*${term}*,description_bn.ilike.*${term}*,author_name.ilike.*${term}*`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && books) {
        for (const b of books) {
          results.push({
            type: "book",
            id: b.id,
            slug: b.slug,
            title: b.title_en || b.title_bn || "",
            excerpt: b.description_en || b.description_bn || "",
            url: `/books/${b.slug}`,
            thumbnail: b.cover_image,
            created_at: b.created_at,
          });
        }
      }
    }

    if (!type || type === "video") {
      const { data: videos, error } = await db
        .from("videos")
        .select("id, slug, title, description, thumbnail_url, created_at")
        .or(`title.ilike.*${term}*,description.ilike.*${term}*`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && videos) {
        for (const v of videos) {
          results.push({
            type: "video",
            id: v.id,
            slug: v.slug,
            title: v.title,
            excerpt: v.description || "",
            url: `/videos/${v.slug}`,
            thumbnail: v.thumbnail_url,
            created_at: v.created_at,
          });
        }
      }
    }

    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      results: results.slice(offset, offset + limit),
      total: results.length,
    };
  });
