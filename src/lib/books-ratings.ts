import { supabase } from "@/integrations/supabase/client";
import { isMockMode } from "@/lib/data-source";
import {
  mockGetUserRating,
  mockGetRatingAggregates,
  mockSubmitRating as mockSubmit,
  mockDeleteRating as mockDelete,
} from "@/lib/mock-ratings";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface BookRating {
  id: string;
  user_id: string;
  book_id: string;
  rating: number; // 1-5
  created_at: string;
  updated_at: string;
}

export interface RatingSubmission {
  userId: string;
  bookId: string;
  rating: number; // 1-5
}

export interface RatingAggregate {
  avg_rating: number;
  total_ratings: number;
  distribution: Record<number, number>; // { 1: count, 2: count, ... }
}

/* ─── Submit or update a rating (one per user per book) ────────── */

/**
 * Submit or update a rating for a book. One rating per user per book.
 * The database trigger `update_book_rating_aggregates()` automatically
 * updates `avg_rating` and `total_ratings` on the books table.
 *
 * @returns The updated/created rating, or throws on error.
 */
export async function submitRating(input: RatingSubmission): Promise<BookRating> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  // Mock mode (M3 E3.2) — upsert into the mock ratings store; aggregates
  // recompute from the store (mirrors the DB trigger in JS).
  if (isMockMode()) {
    const row = await mockSubmit(input);
    return row as unknown as BookRating;
  }

  // Check if user already rated this book — if so, update instead of insert
  const { data: existing } = await supabase
    .from("book_ratings")
    .select("id, rating")
    .eq("user_id", input.userId)
    .eq("book_id", input.bookId)
    .maybeSingle();

  if (existing) {
    // Update existing rating
    const { data, error } = await supabase
      .from("book_ratings")
      .update({ rating: input.rating, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as BookRating;
  }

  // Insert new rating
  const { data, error } = await supabase
    .from("book_ratings")
    .insert({
      user_id: input.userId,
      book_id: input.bookId,
      rating: input.rating,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as BookRating;
}

/* ─── Get user's rating for a book ─────────────────────────────── */

export async function getUserRating(
  userId: string | null | undefined,
  bookId: string,
): Promise<number | null> {
  if (!userId) return null;

  // Mock mode (M3 E3.2) — from the mock ratings store.
  if (isMockMode()) {
    return mockGetUserRating(userId, bookId);
  }

  const { data, error } = await supabase
    .from("book_ratings")
    .select("rating")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error) return null;
  return data?.rating ?? null;
}

/* ─── Get rating aggregates for a book ─────────────────────────── */

export async function getBookRatingAggregates(bookId: string): Promise<RatingAggregate> {
  // Mock mode (M3 E3.2) — recompute from the mock ratings store.
  if (isMockMode()) {
    return mockGetRatingAggregates(bookId);
  }

  const { data: book } = await supabase
    .from("books")
    .select("avg_rating, total_ratings")
    .eq("id", bookId)
    .maybeSingle();

  // Get rating distribution
  const { data: ratings } = await supabase
    .from("book_ratings")
    .select("rating")
    .eq("book_id", bookId);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (ratings) {
    for (const r of ratings as { rating: number }[]) {
      distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    }
  }

  return {
    avg_rating: Number(book?.avg_rating ?? 0),
    total_ratings: book?.total_ratings ?? 0,
    distribution,
  };
}

/* ─── Delete user's rating for a book ──────────────────────────── */

export async function deleteRating(userId: string, bookId: string): Promise<void> {
  // Mock mode (M3 E3.2) — from the mock ratings store.
  if (isMockMode()) {
    await mockDelete(userId, bookId);
    return;
  }

  const { error } = await supabase
    .from("book_ratings")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (error) throw new Error(error.message);
}
