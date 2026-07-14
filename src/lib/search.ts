import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export type ContentType = "post" | "page" | "book" | "video" | "course";

export interface SearchResult {
  type: ContentType;
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  url: string;
  thumbnail: string | null;
  created_at: string;
  /** Highlighted title with <mark> tags */
  highlightedTitle?: string;
  /** Highlighted excerpt with <mark> tags */
  highlightedExcerpt?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

/** Highlight search term in text */
function highlightTerm(text: string, term: string): string {
  if (!term || !text) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/** Build tsquery from search term */
function toTsQuery(term: string): string {
  // Split into words and create AND query
  const words = term.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map((w) => `${w}:*`).join(" & ");
}

export const searchContent = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { q: string; type?: ContentType; page?: number; sort?: "relevance" | "date" };
    const q = input.q || "";
    const type = input.type;
    const sort = input.sort || "relevance";
    const page = input.page || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const results: SearchResult[] = [];
    const db = supabase as any;
    const term = q.trim().replace(/[%_]/g, "");

    if (!term) return { results: [], total: 0 };

    const tsQuery = toTsQuery(term);

    // Helper to search a table with FTS
    async function searchTable(
      tableName: string,
      select: string,
      filters: string,
      urlFn: (row: any) => string,
      type: ContentType,
      titleFn: (row: any) => string,
      excerptFn: (row: any) => string,
      thumbnailFn: (row: any) => string | null,
    ) {
      try {
        let query = db
          .from(tableName)
          .select(select)
          .eq(filters.split("=")[0], filters.split("=")[1])
          .textSearch("search_vector", tsQuery, { type: "plain" })
          .order("created_at", { ascending: false })
          .limit(limit);

        const { data: rows, error } = await query;
        if (error || !rows) return;

        for (const row of rows) {
          const title = titleFn(row);
          const excerpt = excerptFn(row);
          results.push({
            type,
            id: row.id,
            slug: row.slug,
            title,
            excerpt: excerpt?.substring(0, 200) || "",
            url: urlFn(row),
            thumbnail: thumbnailFn(row),
            created_at: row.created_at,
            highlightedTitle: highlightTerm(title, term),
            highlightedExcerpt: highlightTerm(excerpt?.substring(0, 200) || "", term),
          });
        }
      } catch {
        // FTS index might not exist yet — fall back to ILIKE
        await searchTableFallback(tableName, select, filters, urlFn, type, titleFn, excerptFn, thumbnailFn, term, limit);
      }
    }

    // Fallback to ILIKE if FTS fails
    async function searchTableFallback(
      tableName: string,
      select: string,
      filters: string,
      urlFn: (row: any) => string,
      type: ContentType,
      titleFn: (row: any) => string,
      excerptFn: (row: any) => string,
      thumbnailFn: (row: any) => string | null,
      term: string,
      limit: number,
    ) {
      try {
        const [filterCol, filterVal] = filters.split("=");
        const { data: rows, error } = await db
          .from(tableName)
          .select(select)
          .eq(filterCol, filterVal)
          .or(`title_en.ilike.*${term}*,title_bn.ilike.*${term}*,excerpt_en.ilike.*${term}*,excerpt_bn.ilike.*${term}*`)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error || !rows) return;
        for (const row of rows) {
          const title = titleFn(row);
          const excerpt = excerptFn(row);
          results.push({
            type,
            id: row.id,
            slug: row.slug,
            title,
            excerpt: excerpt?.substring(0, 200) || "",
            url: urlFn(row),
            thumbnail: thumbnailFn(row),
            created_at: row.created_at,
            highlightedTitle: highlightTerm(title, term),
            highlightedExcerpt: highlightTerm(excerpt?.substring(0, 200) || "", term),
          });
        }
      } catch { /* silent */ }
    }

    // Search each content type
    if (!type || type === "post") {
      await searchTable(
        "posts",
        "id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, created_at",
        "status=published",
        (r) => `/posts/${r.slug}`,
        "post",
        (r) => r.title_en || r.title_bn || "",
        (r) => r.excerpt_en || r.excerpt_bn || "",
        (r) => r.cover_image,
      );
    }

    if (!type || type === "page") {
      await searchTable(
        "pages",
        "id, slug, title_en, title_bn, header_en, header_bn, body_en, body_bn, banner_url, created_at",
        "visible=true",
        (r) => r.slug === "home" ? "/" : `/pages/${r.slug}`,
        "page",
        (r) => r.title_en || r.title_bn || "",
        (r) => r.header_en || r.header_bn || r.body_en?.substring(0, 200) || "",
        (r) => r.banner_url,
      );
    }

    if (!type || type === "book") {
      await searchTable(
        "books",
        "id, slug, title_en, title_bn, description_en, description_bn, cover_image, author_name, created_at",
        "status=published",
        (r) => `/books/${r.slug}`,
        "book",
        (r) => r.title_en || r.title_bn || "",
        (r) => r.description_en || r.description_bn || "",
        (r) => r.cover_image,
      );
    }

    if (!type || type === "video") {
      await searchTable(
        "videos",
        "id, slug, title, description, thumbnail_url, created_at",
        "status=published",
        (r) => `/videos/${r.slug}`,
        "video",
        (r) => r.title || "",
        (r) => r.description || "",
        (r) => r.thumbnail_url,
      );
    }

    if (!type || type === "course") {
      await searchTable(
        "courses",
        "id, slug, title_en, title_bn, description_en, description_bn, cover_image, created_at",
        "published=true",
        (r) => `/courses/${r.slug}`,
        "course",
        (r) => r.title_en || r.title_bn || "",
        (r) => r.description_en || r.description_bn || "",
        (r) => r.cover_image,
      );
    }

    // Sort results
    if (sort === "date") {
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    // relevance sort is default (results come in FTS rank order)

    return {
      results: results.slice(offset, offset + limit),
      total: results.length,
    };
  },
);

/** Log a search query for analytics */
export const logSearchQuery = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { query: string; resultsCount: number; userId?: string };
    const db = supabase as any;
    await db.from("search_analytics").insert({
      query: input.query,
      user_id: input.userId || null,
      results_count: input.resultsCount,
    });
  },
);

/** Get search analytics (admin) */
export const getSearchAnalytics = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = supabase as any;
    const { data: topQueries } = await db
      .from("search_analytics")
      .select("query, count:id.count()")
      .group("query")
      .order("count", { ascending: false })
      .limit(20);

    const { data: recentSearches } = await db
      .from("search_analytics")
      .select("query, results_count, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    return { topQueries: topQueries || [], recentSearches: recentSearches || [] };
  },
);
