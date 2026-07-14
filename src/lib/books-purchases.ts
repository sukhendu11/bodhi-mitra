import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface Purchase {
  id: string;
  user_id: string;
  book_id: string;
  amount_paid: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseResult {
  alreadyOwned: boolean;
  purchase?: Purchase;
  error?: string;
}

export interface CanAccessResult {
  canAccess: boolean;
  reason?: "unauthenticated" | "not_purchased" | "free" | "owned" | "admin";
}

/* ─── Check if user can access a book's PDF ────────────────────── */

/**
 * Check whether a user can access a book's PDF.
 * Access is granted if: book is free, user has purchased it, or user is admin.
 */
export async function canAccessPdf(
  userId: string | null | undefined,
  bookId: string,
): Promise<CanAccessResult> {
  if (!userId) {
    return { canAccess: false, reason: "unauthenticated" };
  }

  // Check if it's a free book (all authenticated users can view free books)
  const { data: book } = await (supabase as any)
    .from("books")
    .select("is_free, status")
    .eq("id", bookId)
    .maybeSingle();

  if (!book) {
    return { canAccess: false, reason: "not_purchased" };
  }

  if (book.is_free) {
    return { canAccess: true, reason: "free" };
  }

  // Check admin/editor access
  const { data: roleRow } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin", "editor"])
    .maybeSingle();

  if (roleRow) {
    return { canAccess: true, reason: "admin" };
  }

  // Check if user has purchased this book
  const { data: purchase } = await (supabase as any)
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (purchase) {
    return { canAccess: true, reason: "owned" };
  }

  return { canAccess: false, reason: "not_purchased" };
}

/* ─── Generate signed URL for private PDF ──────────────────────── */

/**
 * Generate a signed URL for a book's PDF with a 5-minute expiry.
 * The caller MUST have already been verified via `canAccessPdf`.
 *
 * @param bucketPath - The storage path of the PDF (e.g., "books/pdfs/123-abc.pdf")
 * @param expiresIn - Seconds until the URL expires (default 300 = 5 min)
 */
export async function getSignedPdfUrl(bucketPath: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from("book-pdfs")
    .createSignedUrl(bucketPath, expiresIn);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* ─── Purchase a book (idempotent) ─────────────────────────────── */

/**
 * Record a book purchase for a user. Idempotent — if the user already
 * owns the book, returns `{ alreadyOwned: true }` without creating a duplicate.
 *
 * @param userId - The authenticated user's ID
 * @param bookId - The book to purchase
 * @param amountPaid - The amount paid (0 for free books)
 */
export async function purchaseBook(
  userId: string,
  bookId: string,
  amountPaid = 0,
): Promise<PurchaseResult> {
  // Check if already owned (idempotency guard)
  const { data: existing } = await (supabase as any)
    .from("purchases")
    .select("id, user_id, book_id, amount_paid, purchase_date, created_at, updated_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    return { alreadyOwned: true, purchase: existing as Purchase };
  }

  // Create the purchase
  const { data, error } = await (supabase as any)
    .from("purchases")
    .insert({
      user_id: userId,
      book_id: bookId,
      amount_paid: amountPaid,
      purchase_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === "23505") {
      return { alreadyOwned: true };
    }
    return { alreadyOwned: false, error: error.message };
  }

  return { alreadyOwned: false, purchase: data as Purchase };
}

/* ─── Check if user owns a book ────────────────────────────────── */

/**
 * Quick check if a user has purchased (or has free access to) a book.
 * Returns true if the user owns the book or the book is free.
 */
export async function checkOwnership(
  userId: string | null | undefined,
  bookId: string,
): Promise<boolean> {
  if (!userId) return false;

  // Free books are "owned" by everyone authenticated
  const { data: book } = await (supabase as any)
    .from("books")
    .select("is_free")
    .eq("id", bookId)
    .maybeSingle();

  if (book?.is_free) return true;

  const { data: purchase } = await (supabase as any)
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  return !!purchase;
}

/* ─── Get all purchases for the current user ───────────────────── */

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  const { data, error } = await (supabase as any)
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("purchase_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Purchase[];
}

/* ─── Get purchase stats for a book (admin) ────────────────────── */

export async function getBookPurchaseStats(bookId: string): Promise<{
  totalPurchases: number;
  totalRevenue: number;
}> {
  const db = supabase as any;

  const { count } = await db
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId);

  const { data } = await db.from("purchases").select("amount_paid").eq("book_id", bookId);

  const totalRevenue = (data ?? []).reduce(
    (sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid),
    0,
  );

  return {
    totalPurchases: count ?? 0,
    totalRevenue,
  };
}

/* ─── User Library ────────────────────────────────────────────── */

export interface LibraryBook {
  bookId: string;
  titleEn: string | null;
  titleBn: string | null;
  slug: string;
  coverImage: string | null;
  author: string | null;
  isFree: boolean;
  purchaseDate: string;
  progressPct: number;
  completed: boolean;
  lastPage: number;
  totalPages: number;
  updatedAt: string | null;
}

export interface LibraryResult {
  books: LibraryBook[];
}

export const getMyLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as any;

    const { data: purchases } = await db
      .from("purchases")
      .select("book_id, purchase_date, created_at")
      .eq("user_id", userId)
      .order("purchase_date", { ascending: false });

    if (!purchases?.length) return { books: [] } as LibraryResult;

    const bookIds = purchases.map((p: any) => p.book_id) as string[];

    const [{ data: books }, { data: progress }] = await Promise.all([
      db
        .from("books")
        .select("id, title_en, title_bn, slug, cover_image, author_name, is_free, pages")
        .in("id", bookIds),
      db
        .from("reading_progress")
        .select("book_id, progress_pct, completed, last_page, total_pages, updated_at")
        .eq("user_id", userId)
        .in("book_id", bookIds),
    ]);

    const bookMap = new Map((books ?? []).map((b: any) => [b.id, b]));
    const progressMap = new Map((progress ?? []).map((p: any) => [p.book_id, p]));

    const result: LibraryBook[] = (purchases ?? []).map((p: any) => {
      const book = (bookMap.get(p.book_id) ?? {}) as Record<string, any>;
      const prog = progressMap.get(p.book_id) as Record<string, any> | undefined;
      return {
        bookId: p.book_id,
        titleEn: book.title_en ?? null,
        titleBn: book.title_bn ?? null,
        slug: book.slug ?? "",
        coverImage: book.cover_image ?? null,
        author: book.author_name ?? null,
        isFree: !!book.is_free,
        purchaseDate: p.purchase_date ?? p.created_at,
        progressPct: prog?.progress_pct ?? 0,
        completed: prog?.completed ?? false,
        lastPage: prog?.last_page ?? 0,
        totalPages: prog?.total_pages ?? book.pages ?? 0,
        updatedAt: prog?.updated_at ?? null,
      };
    });

    return { books: result } as LibraryResult;
  });
