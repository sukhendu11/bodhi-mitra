import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────── */

export type ResourceType = "post" | "book";

export interface BookmarkedItem {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  slug: string;
  titleEn: string | null;
  titleBn: string | null;
  coverImage: string | null;
  authorName: string | null;
  excerptEn?: string | null;
  excerptBn?: string | null;
  category?: string | null;
  createdAt: string;
  bookmarkedAt: string;
  /** Book-specific fields (only populated for books) */
  isFree?: boolean;
  featured?: boolean;
  price?: number;
  pages?: number;
  avgRating?: number;
  totalRatings?: number;
  pdfUrl?: string | null;
}

/* ─── Toggle bookmark (post or book) ────────────────────────────── */

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { resourceId: string; resourceType: ResourceType };
    const db = supabase as any;

    const existing = await db
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("resource_id", input.resourceId)
      .eq("resource_type", input.resourceType)
      .maybeSingle();

    if (existing.data) {
      await db.from("bookmarks").delete().eq("id", existing.data.id);
      return { bookmarked: false };
    }

    await db.from("bookmarks").insert({
      user_id: userId,
      resource_id: input.resourceId,
      resource_type: input.resourceType,
    });
    return { bookmarked: true };
  });

/* ─── Get all user bookmarks (posts + books) ───────────────────── */

export const getUserBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const db = supabase as any;

    const { data, error } = await db
      .from("bookmarks")
      .select("id, resource_id, resource_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = data ?? [];
    if (!rows.length) return [] as BookmarkedItem[];

    // Separate by resource type for efficient batch fetching
    const postResourceIds: string[] = [];
    const bookResourceIds: string[] = [];

    for (const r of rows) {
      if (r.resource_type === "post") postResourceIds.push(r.resource_id);
      else if (r.resource_type === "book") bookResourceIds.push(r.resource_id);
    }

    const [posts, books] = await Promise.all([
      postResourceIds.length
        ? db
            .from("posts")
            .select(
              "id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, category, author_name, created_at",
            )
            .in("id", postResourceIds)
        : { data: [] },
      bookResourceIds.length
        ? db
            .from("books")
            .select(
              "id, slug, title_en, title_bn, cover_image, author_name, created_at, is_free, featured, price, pages, avg_rating, total_ratings, pdf_url",
            )
            .in("id", bookResourceIds)
        : { data: [] },
    ]);

    const postMap = new Map((posts.data ?? []).map((p: any) => [p.id, p]));
    const bookMap = new Map((books.data ?? []).map((b: any) => [b.id, b]));

    const results: BookmarkedItem[] = rows.map((r: any) => {
      if (r.resource_type === "post") {
        const p: Record<string, any> = postMap.get(r.resource_id) ?? {};
        return {
          id: r.id,
          resourceId: r.resource_id,
          resourceType: "post" as ResourceType,
          slug: p.slug ?? "",
          titleEn: p.title_en ?? null,
          titleBn: p.title_bn ?? null,
          coverImage: p.cover_image ?? null,
          authorName: p.author_name ?? null,
          excerptEn: p.excerpt_en ?? null,
          excerptBn: p.excerpt_bn ?? null,
          category: p.category ?? null,
          createdAt: p.created_at ?? "",
          bookmarkedAt: r.created_at,
        };
      }
      const b: Record<string, any> = bookMap.get(r.resource_id) ?? {};
      return {
        id: r.id,
        resourceId: r.resource_id,
        resourceType: "book" as ResourceType,
        slug: b.slug ?? "",
        titleEn: b.title_en ?? null,
        titleBn: b.title_bn ?? null,
        coverImage: b.cover_image ?? null,
        authorName: b.author_name ?? null,
        createdAt: b.created_at ?? "",
        bookmarkedAt: r.created_at,
        isFree: !!b.is_free,
        featured: !!b.featured,
        price: Number(b.price ?? 0),
        pages: Number(b.pages ?? 0),
        avgRating: Number(b.avg_rating ?? 0),
        totalRatings: Number(b.total_ratings ?? 0),
        pdfUrl: b.pdf_url ?? null,
      };
    });

    return results;
  });

/* ─── Get bookmark status for a specific resource ───────────────── */

export const getBookmarkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { resourceId: string; resourceType: ResourceType };
    const db = supabase as any;

    const { data: existing } = await db
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("resource_id", input.resourceId)
      .eq("resource_type", input.resourceType)
      .maybeSingle();

    return { bookmarked: !!existing };
  });
