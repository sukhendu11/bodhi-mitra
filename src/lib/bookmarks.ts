import { createServerFn } from "@tanstack/react-start";
import { requireAuthOrMock } from "@/lib/mock-auth";
import { isMockMode } from "@/lib/data-source";
import { isMockId } from "@/lib/utils";
import {
  mockGetBookmarkStatus,
  mockGetUserBookmarks,
  mockToggleBookmark,
} from "@/lib/mock-bookmarks";

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

/* ─── Mock-mode client dispatch (localStorage persistence) ────────
   Server functions execute server-side, where the mock bookmark store
   lives in module memory and is wiped on restart. In mock mode the UI
   calls these client-side wrappers directly instead, so bookmarks are
   backed by the browser's localStorage — surviving reloads and
   dev-server restarts (same pattern as the wishlist). */

export function getBookmarkStatusClient(input: {
  resourceId: string;
  resourceType: ResourceType;
  userId?: string;
}): Promise<{ bookmarked: boolean }> {
  return mockGetBookmarkStatus(input.userId ?? "", input.resourceId, input.resourceType);
}

export function toggleBookmarkClient(input: {
  resourceId: string;
  resourceType: ResourceType;
  userId?: string;
}): Promise<{ bookmarked: boolean }> {
  return mockToggleBookmark(input.userId ?? "", input.resourceId, input.resourceType);
}

export function getUserBookmarksClient(userId?: string): Promise<BookmarkedItem[]> {
  return mockGetUserBookmarks(userId ?? "");
}

export function getBookmarkCountClient(userId?: string): Promise<number> {
  return mockGetUserBookmarks(userId ?? "").then((items) => items.length);
}

/* ─── Toggle bookmark (post or book) ────────────────────────────── */

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: any; userId: string | null };
      data: unknown;
    }) => {
      const { supabase: ctxSupabase, userId } = context;
      const input = data as { resourceId: string; resourceType: ResourceType; userId?: string };
      // Mock trust boundary: no real JWT in mock mode, client passes demo userId.
      const uid = userId ?? input.userId ?? "";

      // Mock mode (M3 E3.3) — toggle in the mock bookmarks store.
      if (!ctxSupabase || isMockMode() || isMockId(input.resourceId)) {
        return mockToggleBookmark(uid, input.resourceId, input.resourceType);
      }

      const db = ctxSupabase;
      const existing = await db
        .from("bookmarks")
        .select("id")
        .eq("user_id", uid)
        .eq("resource_id", input.resourceId)
        .eq("resource_type", input.resourceType)
        .maybeSingle();

      if (existing.data) {
        await db.from("bookmarks").delete().eq("id", existing.data.id);
        return { bookmarked: false };
      }

      await db.from("bookmarks").insert({
        user_id: uid,
        resource_id: input.resourceId,
        resource_type: input.resourceType,
      });
      return { bookmarked: true };
    },
  );

/* ─── Get all user bookmarks (posts + books) ───────────────────── */

export const getUserBookmarks = createServerFn({ method: "GET" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: any; userId: string | null };
      data: unknown;
    }) => {
      const { supabase: ctxSupabase, userId } = context;
      const input = (data ?? {}) as { userId?: string };
      const uid = userId ?? input.userId ?? "";

      // Mock mode (M3 E3.3) — enriched from the mock bookmarks store.
      if (!ctxSupabase || isMockMode()) {
        return mockGetUserBookmarks(uid);
      }

      const db = ctxSupabase;
      const { data: rows, error } = await db
        .from("bookmarks")
        .select("id, resource_id, resource_type, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const bookmarkRows = rows ?? [];
      if (!bookmarkRows.length) return [] as BookmarkedItem[];

      // Separate by resource type for efficient batch fetching
      const postResourceIds: string[] = [];
      const bookResourceIds: string[] = [];

      for (const r of bookmarkRows) {
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

      const results: BookmarkedItem[] = bookmarkRows.map((r: any) => {
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
    },
  );

/* ─── Get total bookmark count (badges across header/dropdown/nav) ─ */

export const getBookmarkCount = createServerFn({ method: "GET" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: any; userId: string | null };
      data: unknown;
    }) => {
      const { supabase: ctxSupabase, userId } = context;
      const input = (data ?? {}) as { userId?: string };
      const uid = userId ?? input.userId ?? "";

      // Mock mode — localStorage-backed store (client wrapper is used in mock
      // mode by UI components so the count survives reloads).
      if (!ctxSupabase || isMockMode()) {
        return mockGetUserBookmarks(uid).then((items) => items.length);
      }

      const db = ctxSupabase;
      const { count, error } = await db
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);

      if (error) throw error;
      return count ?? 0;
    },
  );

/* ─── Get bookmark status for a specific resource ───────────────── */

export const getBookmarkStatus = createServerFn({ method: "GET" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: any; userId: string | null };
      data: unknown;
    }) => {
      const { supabase: ctxSupabase, userId } = context;
      const input = data as { resourceId: string; resourceType: ResourceType; userId?: string };
      const uid = userId ?? input.userId ?? "";

      // Mock mode (M3 E3.3) — from the mock bookmarks store.
      if (!ctxSupabase || isMockMode() || isMockId(input.resourceId)) {
        return mockGetBookmarkStatus(uid, input.resourceId, input.resourceType);
      }

      const db = ctxSupabase;
      const { data: existing } = await db
        .from("bookmarks")
        .select("id")
        .eq("user_id", uid)
        .eq("resource_id", input.resourceId)
        .eq("resource_type", input.resourceType)
        .maybeSingle();

      return { bookmarked: !!existing };
    },
  );
