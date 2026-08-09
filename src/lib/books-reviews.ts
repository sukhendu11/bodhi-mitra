import { supabase } from "@/integrations/supabase/client";
import { isMockMode } from "@/lib/data-source";
import {
  mockFetchBookReviews,
  mockGetUserBookReview,
  mockSubmitBookReview,
  mockDeleteBookReview,
} from "@/lib/mock-reviews";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface BookReview {
  id: string;
  user_id: string;
  book_id: string;
  rating: number; // 1-5
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewSubmission {
  userId: string;
  bookId: string;
  rating: number; // 1-5
  title?: string;
  body: string;
  /** Display name attached to the review (falls back to "Reader"). */
  authorName?: string;
}

/* ─── Best-effort client for the not-yet-migrated book_reviews table ──

   The generated Supabase row types predate this table; the migration
   lands during Phase 6 hookup, at which point the cast can be dropped.
   These branches are inert in mock mode (mock-first dispatch above). */
const reviewsTable = () => supabase.from("book_reviews" as any) as any;

/* ─── Fetch all public reviews for a book (newest first) ───────── */

export async function fetchBookReviews(bookId: string): Promise<BookReview[]> {
  // Mock mode — from the seeded mock reviews store.
  if (isMockMode()) {
    return mockFetchBookReviews(bookId);
  }

  // Real mode: best-effort against the `book_reviews` table (see above).
  const { data, error } = await reviewsTable()
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BookReview[];
}

/* ─── Get the current user's review for a book (if any) ────────── */

export async function getUserBookReview(
  userId: string | null | undefined,
  bookId: string,
): Promise<BookReview | null> {
  if (!userId) return null;

  if (isMockMode()) {
    return mockGetUserBookReview(userId, bookId);
  }

  const { data, error } = await reviewsTable()
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();
  if (error) return null;
  return (data as BookReview | null) ?? null;
}

/* ─── Submit or update a review (one per user per book) ────────── */

/**
 * Upsert a review. In mock mode the star rating is also written to the
 * ratings store so the aggregate breakdown moves in lockstep.
 */
export async function submitBookReview(input: ReviewSubmission): Promise<BookReview> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  if (!input.body.trim()) {
    throw new Error("Review text is required");
  }

  if (isMockMode()) {
    const row = await mockSubmitBookReview(input);
    return row as unknown as BookReview;
  }

  // Real mode does NOT upsert into book_ratings here — the rating side
  // of a review lands in the ratings service instead (mock mode syncs via
  // mockSubmitRating). Revisit when the book_reviews migration lands.
  const payload = {
    user_id: input.userId,
    book_id: input.bookId,
    rating: input.rating,
    title: input.title?.trim() ?? "",
    body: input.body.trim(),
    author_name: input.authorName?.trim() || "Reader",
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await reviewsTable()
    .select("id")
    .eq("user_id", input.userId)
    .eq("book_id", input.bookId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await reviewsTable()
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BookReview;
  }

  const { data, error } = await reviewsTable()
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BookReview;
}

/* ─── Delete the current user's review for a book ──────────────── */

export async function deleteBookReview(userId: string, bookId: string): Promise<void> {
  if (isMockMode()) {
    await mockDeleteBookReview(userId, bookId);
    return;
  }

  const { error } = await reviewsTable()
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);
  if (error) throw new Error(error.message);
}
