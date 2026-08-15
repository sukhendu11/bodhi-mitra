import { supabase } from "@/integrations/supabase/client";
import {
  mockFetchBookById,
  mockFetchBookBySlug,
  mockFetchPublishedBooks,
  mockFetchAllBooks,
} from "@/lib/mock-data";
import { isMockMode } from "@/lib/data-source";
import { mockGetRatingAggregates } from "@/lib/mock-ratings";

export type BookStatus = "draft" | "published" | "archived";

export interface Book {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  author_name: string;
  /** Short author bio shown on the detail page (localized). */
  author_bio_en?: string;
  author_bio_bn?: string;
  /** Chapter titles for the table-of-contents preview on the detail page. */
  chapters?: string[];
  /** Optional starting page per chapter (parallel to `chapters`) for TOC jumps. */
  chapter_pages?: number[];
  description_en: string;
  description_bn: string;
  cover_image: string;
  pdf_url: string;
  pdf_file_size: number;
  price: number;
  is_free: boolean;
  pages: number;
  isbn: string;
  status: BookStatus;
  featured: boolean;
  tags: string[];
  category: string;
  meta_description_en: string;
  meta_description_bn: string;
  sort_order: number;
  avg_rating: number;
  total_ratings: number;
  created_at: string;
  updated_at: string;
  /** Optional SEO title override — falls back to title_en when absent. */
  seo_title?: string | null;
}

export interface BookInput {
  slug: string;
  title_en: string;
  title_bn: string;
  author_name?: string;
  author_bio_en?: string;
  author_bio_bn?: string;
  chapters?: string[];
  chapter_pages?: number[];
  description_en?: string;
  description_bn?: string;
  cover_image?: string;
  pdf_url?: string;
  pdf_file_size?: number;
  price?: number;
  is_free?: boolean;
  pages?: number;
  isbn?: string;
  status?: BookStatus;
  featured?: boolean;
  tags?: string[];
  category?: string;
  meta_description_en?: string;
  meta_description_bn?: string;
  sort_order?: number;
}

export interface PaginatedBooks {
  data: Book[];
  total: number;
}

export type BookSortOption = "newest" | "oldest" | "title-asc" | "title-desc" | "rating-desc" | "rating-asc" | "price-asc" | "price-desc" | "popular";

/**
 * In mock mode, overlay the live rating aggregates (community baseline +
 * stored user ratings) onto the static mock book data — mirrors the DB
 * trigger's effect on the books grid.
 */
async function applyRatingAggregates(books: Book[]): Promise<Book[]> {
  if (!isMockMode()) return books;
  return Promise.all(
    books.map(async (b) => {
      const agg = await mockGetRatingAggregates(b.id);
      return { ...b, avg_rating: agg.avg_rating, total_ratings: agg.total_ratings };
    }),
  );
}

export async function fetchPublishedBooks(
  page = 1,
  pageSize = 12,
  options?: { category?: string; featured?: boolean; search?: string; sort?: BookSortOption },
): Promise<PaginatedBooks> {
  const result = mockFetchPublishedBooks(page, pageSize, options);
  return { ...result, data: await applyRatingAggregates(result.data) };
}

/**
 * Fetch a single book by slug (public).
 * Tries Strapi API first, falls back to Supabase.
 */
export async function fetchBookBySlug(slug: string): Promise<Book | null> {
  const book = mockFetchBookBySlug(slug);
  if (!book) return null;
  const [overlaid] = await applyRatingAggregates([book]);
  return overlaid;
}

/** Fetch a single book by ID (admin). Mock-first, then Supabase fallback. */
export async function fetchBookById(id: string): Promise<Book | null> {
  // Mock mode — short-circuit before probing Supabase (reader route path)
  if (isMockMode()) {
    const book = mockFetchBookById(id);
    if (!book) return null;
    const [overlaid] = await applyRatingAggregates([book]);
    return overlaid;
  }

  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return data as Book;
  } catch {
    // Supabase unavailable — fall through
  }

  // Fallback to mock data
  const book = mockFetchBookById(id);
  if (!book) return null;
  const [overlaid] = await applyRatingAggregates([book]);
  return overlaid;
}

/** Fetch all books for admin (including drafts/archived). Mock-first. */
export async function fetchAllBooks(
  page = 1,
  pageSize = 20,
  options?: { status?: BookStatus; category?: string; search?: string },
): Promise<PaginatedBooks> {
  // Mock mode — serve from the mock CMS store (no Supabase probe)
  if (isMockMode()) {
    const all = mockFetchAllBooks();
    const filtered = all.filter((b) => {
      if (options?.status && b.status !== options.status) return false;
      if (options?.category && b.category !== options.category) return false;
      if (options?.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        // Mirror the real Supabase branch: title_en + title_bn + author
        if (
          !b.title_en.toLowerCase().includes(q) &&
          !b.title_bn.toLowerCase().includes(q) &&
          !b.author_name.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
    const from = (page - 1) * pageSize;
    return { data: filtered.slice(from, from + pageSize), total: filtered.length };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("books")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options?.status) query = query.eq("status", options.status);
    if (options?.category) query = query.eq("category", options.category);
    if (options?.search?.trim()) {
      const q = options.search.trim().replace(/[%_]/g, "");
      if (q) query = query.or(`title_en.ilike.*${q}*,title_bn.ilike.*${q}*,author_name.ilike.*${q}*`);
    }

    const { data, error, count } = await query;
    if (!error && data) {
      return { data: (data ?? []) as Book[], total: count ?? 0 };
    }
  } catch {
    // Supabase unavailable — fall through
  }

  return { data: [], total: 0 };
}

/** Create a new book. */
export async function createBook(input: BookInput): Promise<Book> {
  // Cast at the DB boundary — the generated Supabase row type predates the
  // author_bio/chapters columns (added in mock data; migration lands at hookup).
  const { data, error } = await supabase.from("books").insert(input as any).select().single();
  if (error) throw error;
  return data as Book;
}

/** Update an existing book. */
export async function updateBook(id: string, input: Partial<BookInput>): Promise<Book> {
  // Cast at the DB boundary — see createBook note.
  const { data, error } = await supabase
    .from("books")
    .update(input as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

/** Delete a book. */
export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

/** Get books stats for admin dashboard — includes purchase stats. */
export async function getBookStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
  free: number;
  totalPurchases: number;
  totalRevenue: number;
}> {
  const db = supabase;

  const [
    { count: total },
    { count: published },
    { count: draft },
    { count: archived },
    { count: free },
  ] = await Promise.all([
    db.from("books").select("*", { count: "exact", head: true }),
    db.from("books").select("*", { count: "exact", head: true }).eq("status", "published"),
    db.from("books").select("*", { count: "exact", head: true }).eq("status", "draft"),
    db.from("books").select("*", { count: "exact", head: true }).eq("status", "archived"),
    db.from("books").select("*", { count: "exact", head: true }).eq("is_free", true),
  ]);

  // Purchase stats
  const [{ count: totalPurchases }, { data: revenueData }] = await Promise.all([
    db.from("purchases").select("*", { count: "exact", head: true }),
    db.from("purchases").select("amount_paid"),
  ]);

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid ?? 0),
    0,
  );

  return {
    total: total ?? 0,
    published: published ?? 0,
    draft: draft ?? 0,
    archived: archived ?? 0,
    free: free ?? 0,
    totalPurchases: totalPurchases ?? 0,
    totalRevenue,
  };
}

import { slugifyBook as cmsSlugifyBook } from "@/lib/cms-engine";

/** @deprecated Use slugifyBook from @/lib/cms-engine instead */
export function slugifyBook(title: string): string {
  return cmsSlugifyBook(title);
}
