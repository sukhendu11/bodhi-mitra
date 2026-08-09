/**
 * Mock bookmarks — M3 Reading & Engagement seam (ROADMAP.md).
 *
 * Mirrors the Supabase `bookmarks` table (polymorphic: post or book)
 * for the offline demo. localStorage on the client, in-memory on the
 * server — same pattern as mock-cart.ts / mock-commerce.ts.
 *
 * `mockGetUserBookmarks` joins against the mock posts/books data to
 * build the enriched `BookmarkedItem` shape the UI expects, so the
 * BookmarkButton on posts + books persists across reloads.
 */
import { mockFetchPublishedBooks, mockFetchPosts } from "@/lib/mock-data";
import type { Book } from "@/lib/books";
import type { Post } from "@/lib/posts";
import type { BookmarkedItem, ResourceType } from "@/lib/bookmarks";

const STORE_KEY = "sabbe-satta-mock-bookmarks";

export interface MockBookmarkRow {
  id: string;
  user_id: string;
  resource_id: string;
  resource_type: ResourceType;
  created_at: string;
}

const memoryStore: MockBookmarkRow[] = [];

function readStore(): MockBookmarkRow[] {
  if (typeof window === "undefined") return [...memoryStore];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockBookmarkRow[];
  } catch {
    return [];
  }
}

function writeStore(rows: MockBookmarkRow[]) {
  if (typeof window === "undefined") {
    memoryStore.length = 0;
    memoryStore.push(...rows);
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function generateId() {
  return `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function mockGetBookmarkStatus(
  userId: string,
  resourceId: string,
  resourceType: ResourceType,
): Promise<{ bookmarked: boolean }> {
  return {
    bookmarked: readStore().some(
      (r) =>
        r.user_id === userId &&
        r.resource_id === resourceId &&
        r.resource_type === resourceType,
    ),
  };
}

export async function mockToggleBookmark(
  userId: string,
  resourceId: string,
  resourceType: ResourceType,
): Promise<{ bookmarked: boolean }> {
  const rows = readStore();
  const existing = rows.find(
    (r) =>
      r.user_id === userId &&
      r.resource_id === resourceId &&
      r.resource_type === resourceType,
  );

  if (existing) {
    writeStore(rows.filter((r) => r.id !== existing.id));
    return { bookmarked: false };
  }

  rows.push({
    id: generateId(),
    user_id: userId,
    resource_id: resourceId,
    resource_type: resourceType,
    created_at: new Date().toISOString(),
  });
  writeStore(rows);
  return { bookmarked: true };
}

/** Enriched bookmarks list (posts + books) — mirrors getUserBookmarks. */
export async function mockGetUserBookmarks(userId: string): Promise<BookmarkedItem[]> {
  const rows = readStore()
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const postRows = rows.filter((r) => r.resource_type === "post");
  const bookRows = rows.filter((r) => r.resource_type === "book");

  // Note: mockFetchPosts defaults to pageSize 9 — fetch all posts so
  // bookmarks on any post resolve titles/covers.
  const posts = postRows.length ? mockFetchPosts(undefined, 1, 100) : { data: [] as Post[] };
  const books = bookRows.length ? mockFetchPublishedBooks(1, 100) : { data: [] as Book[] };

  const results: BookmarkedItem[] = [];

  for (const r of postRows) {
    const p = posts.data.find((x: any) => x.id === r.resource_id);
    results.push({
      id: r.id,
      resourceId: r.resource_id,
      resourceType: "post",
      slug: p?.slug ?? "",
      titleEn: p?.title_en ?? null,
      titleBn: p?.title_bn ?? null,
      coverImage: p?.cover_image ?? null,
      authorName: p?.author_name ?? null,
      excerptEn: p?.excerpt_en ?? null,
      excerptBn: p?.excerpt_bn ?? null,
      category: p?.category ?? null,
      createdAt: p?.created_at ?? "",
      bookmarkedAt: r.created_at,
    });
  }

  for (const r of bookRows) {
    const b = books.data.find((x: any) => x.id === r.resource_id);
    results.push({
      id: r.id,
      resourceId: r.resource_id,
      resourceType: "book",
      slug: b?.slug ?? "",
      titleEn: b?.title_en ?? null,
      titleBn: b?.title_bn ?? null,
      coverImage: b?.cover_image ?? null,
      authorName: b?.author_name ?? null,
      createdAt: b?.created_at ?? "",
      bookmarkedAt: r.created_at,
      isFree: !!b?.is_free,
      featured: !!b?.featured,
      price: Number(b?.price ?? 0),
      pages: Number(b?.pages ?? 0),
      avgRating: Number(b?.avg_rating ?? 0),
      totalRatings: Number(b?.total_ratings ?? 0),
      pdfUrl: b?.pdf_url ?? null,
    });
  }

  return results;
}
