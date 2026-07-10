import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  last_page: number;
  total_pages: number;
  progress_pct: number; // 0.00 - 100.00
  completed: boolean;
  started_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  userId: string;
  bookId: string;
  lastPage: number;
  totalPages?: number;
}

/* ─── Get reading progress for a user & book ───────────────────── */

export async function getReadingProgress(
  userId: string | null | undefined,
  bookId: string,
): Promise<ReadingProgress | null> {
  if (!userId) return null;

  const { data, error } = await (supabase as any)
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as ReadingProgress | null;
}

/* ─── Upsert reading progress (create or update) ───────────────── */

/**
 * Save or update reading progress for a user on a book.
 * Computes `progress_pct` and `completed` automatically.
 */
export async function upsertProgress(
  input: ProgressUpdate,
): Promise<ReadingProgress> {
  const { userId, bookId, lastPage, totalPages } = input;

  // Get total_pages from the book if not provided
  let total = totalPages ?? 0;
  if (total <= 0) {
    const { data: book } = await (supabase as any)
      .from("books")
      .select("pages")
      .eq("id", bookId)
      .maybeSingle();
    total = book?.pages ?? 0;
  }

  const progressPct = total > 0
    ? Math.min(100, Math.round((lastPage / total) * 10000) / 100)
    : 0;

  const completed = progressPct >= 100;

  // Check if progress record exists
  const existing = await getReadingProgress(userId, bookId);

  if (existing) {
    const { data, error } = await (supabase as any)
      .from("reading_progress")
      .update({
        last_page: lastPage,
        total_pages: total,
        progress_pct: progressPct,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ReadingProgress;
  }

  // Create new progress record
  const { data, error } = await (supabase as any)
    .from("reading_progress")
    .insert({
      user_id: userId,
      book_id: bookId,
      last_page: lastPage,
      total_pages: total,
      progress_pct: progressPct,
      completed,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ReadingProgress;
}

/* ─── Mark a book as completed ─────────────────────────────────── */

export async function markBookCompleted(
  userId: string,
  bookId: string,
): Promise<ReadingProgress> {
  return upsertProgress({
    userId,
    bookId,
    lastPage: 999999, // Will get capped to 100%
    totalPages: 1,     // Ensures progress_pct = 100
  });
}

/* ─── Get all reading progress for a user ──────────────────────── */

export async function getUserProgress(
  userId: string,
): Promise<(ReadingProgress & { book_slug: string; book_title_en: string; book_title_bn: string })[]> {
  const { data, error } = await (supabase as any)
    .from("reading_progress")
    .select("*, books!inner(slug, title_en, title_bn)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((row: any) => ({
    ...row,
    book_slug: row.books?.slug ?? "",
    book_title_en: row.books?.title_en ?? "",
    book_title_bn: row.books?.title_bn ?? "",
  }));
}

/* ─── Delete reading progress ──────────────────────────────────── */

export async function deleteProgress(
  userId: string,
  bookId: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("reading_progress")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (error) throw new Error(error.message);
}
