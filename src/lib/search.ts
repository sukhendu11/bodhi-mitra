import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireMinRole } from "./permissions";
import { isMockMode } from "@/lib/data-source";
import { mockFetchPosts, mockFetchPages } from "@/lib/mock-data";
import { mockFetchPublishedBooks } from "@/lib/mock-data";
import { mockFetchPublishedVideos } from "@/lib/mock-data";

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

/**
 * Mock-first search fallback — searches the structured mock data layer
 * (posts / books / videos) when Supabase is unavailable. Keeps the search
 * UI states (loading / results / empty) fully testable offline.
 */
function mockSearchContent(input: {
  q: string;
  type?: ContentType;
  page?: number;
  sort?: "relevance" | "date";
}): SearchResponse {
  const q = (input.q || "").trim();
  const type = input.type;
  const sort = input.sort || "relevance";
  const page = input.page || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const term = q.toLowerCase();

  if (!term) return { results: [], total: 0 };

  const results: SearchResult[] = [];

  const matches = (haystack: string) => haystack.toLowerCase().includes(term);

  // Pages
  if (!type || type === "page") {
    const pages = mockFetchPages();
    for (const p of pages) {
      const title = p.title_en || p.title_bn || "";
      const excerpt = p.body_en || p.body_bn || p.header_en || "";
      if (!matches(`${title} ${excerpt}`)) continue;
      results.push({
        type: "page",
        id: p.id,
        slug: p.slug,
        title,
        excerpt: excerpt.substring(0, 200),
        url: p.slug === "home" ? "/" : `/pages/${p.slug}`,
        thumbnail: p.banner_url || null,
        created_at: p.created_at,
        highlightedTitle: highlightTerm(title, q),
        highlightedExcerpt: highlightTerm(excerpt.substring(0, 200), q),
      });
    }
  }

  // Posts
  if (!type || type === "post") {
    const posts = mockFetchPosts(undefined, 1, 1000).data;
    for (const p of posts) {
      const title = p.title_en || p.title_bn || "";
      const excerpt = p.excerpt_en || p.excerpt_bn || "";
      if (!matches(`${title} ${excerpt}`)) continue;
      results.push({
        type: "post",
        id: p.id,
        slug: p.slug,
        title,
        excerpt: excerpt.substring(0, 200),
        url: `/posts/${p.slug}`,
        thumbnail: p.cover_image || null,
        created_at: p.created_at,
        highlightedTitle: highlightTerm(title, q),
        highlightedExcerpt: highlightTerm(excerpt.substring(0, 200), q),
      });
    }
  }

  // Books
  if (!type || type === "book") {
    const books = mockFetchPublishedBooks(1, 1000).data;
    for (const b of books) {
      const title = b.title_en || b.title_bn || "";
      const excerpt = b.description_en || b.description_bn || "";
      if (!matches(`${title} ${excerpt}`)) continue;
      results.push({
        type: "book",
        id: b.id,
        slug: b.slug,
        title,
        excerpt: excerpt.substring(0, 200),
        url: `/books/${b.slug}`,
        thumbnail: b.cover_image || null,
        created_at: b.created_at,
        highlightedTitle: highlightTerm(title, q),
        highlightedExcerpt: highlightTerm(excerpt.substring(0, 200), q),
      });
    }
  }

  // Videos (no detail page — link to the hub)
  if (!type || type === "video") {
    const videos = mockFetchPublishedVideos(1, 1000).data;
    for (const v of videos) {
      const title = v.title_en || v.title_bn || v.title || "";
      const excerpt = v.description_en || v.description_bn || v.description || "";
      if (!matches(`${title} ${excerpt}`)) continue;
      results.push({
        type: "video",
        id: v.id,
        slug: v.id,
        title,
        excerpt: excerpt.substring(0, 200),
        url: "/videos",
        thumbnail: v.thumbnail_url || null,
        created_at: v.created_at,
        highlightedTitle: highlightTerm(title, q),
        highlightedExcerpt: highlightTerm(excerpt.substring(0, 200), q),
      });
    }
  }

  if (sort === "date") {
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return {
    results: results.slice(offset, offset + limit),
    total: results.length,
  };
}

/**
 * Lightweight Supabase availability probe — used to pick the mock path.
 * Result is cached briefly so the network round-trip only happens once per
 * few seconds instead of on every search request.
 */
let probeCache: { available: boolean; at: number } | null = null;
const PROBE_TTL_MS = 15_000;

async function isSupabaseReachable(): Promise<boolean> {
  if (probeCache && Date.now() - probeCache.at < PROBE_TTL_MS) {
    return probeCache.available;
  }
  try {
    const probe = await supabase.from("posts").select("id").limit(1);
    const available = !probe.error;
    probeCache = { available, at: Date.now() };
    return available;
  } catch {
    probeCache = { available: false, at: Date.now() };
    return false;
  }
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
    const db = supabase;
    const term = q.trim().replace(/[%_]/g, "");

    if (!term) return { results: [], total: 0 };

    // Mock mode → direct mock search (no network probe in dev)
    if (isMockMode()) {
      return mockSearchContent(input);
    }

    // Mock-first: if Supabase is unreachable, search the mock data layer
    if (!(await isSupabaseReachable())) {
      return mockSearchContent(input);
    }

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(tableName as any)
          .select(select)
          .eq(filters.split("=")[0], filters.split("=")[1])
          .textSearch("search_vector", tsQuery, { type: "plain" })
          .order("created_at", { ascending: false })
          .limit(limit);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows, error } = await query as any;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows, error } = await (db
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(tableName as any)
          .select(select)
          .eq(filterCol, filterVal)
          .order("created_at", { ascending: false })
          .limit(limit) as any);

        if (error || !rows) return;

        // Filter in memory since we can't dynamically build ILIKE for different column names
        const filtered = rows.filter((row: any) => {
          const title = titleFn(row);
          const excerpt = excerptFn(row);
          const searchFields = `${title} ${excerpt}`.toLowerCase();
          return searchFields.includes(term.toLowerCase());
        });

        for (const row of filtered) {
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
export const logSearchQuery = createServerFn({ method: "POST" })
  .middleware([requireMinRole("user")])
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { query: string; resultsCount: number; userId?: string };
    const db = supabase;
    await db.from("search_analytics").insert({
      query: input.query,
      user_id: input.userId || null,
      results_count: input.resultsCount,
    });
  },
);

/** Get search analytics (admin) */
export const getSearchAnalytics = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const db = supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: topQueries } = await (db
      .from("search_analytics")
      .select("query, count:id.count()") as any)
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
