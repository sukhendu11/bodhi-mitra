import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSignedPdfUrl, canAccessPdf, checkOwnership, purchaseBook } from "@/lib/books-purchases";

/* ─── Server function: get signed PDF URL ──────────────────────── */

/**
 * Server function to get a signed PDF URL for a book.
 * Enforces access control on the server side before returning the URL.
 *
 * The signed URL expires after 5 minutes (300 seconds).
 * If the session expires, the caller should show "Session expired—refresh".
 */
export const getPdfReaderUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; bucketPath: string };

    // Verify access on the server side
    const access = await canAccessPdf(userId, input.bookId);
    if (!access.canAccess) {
      throw new Error("Access denied. You need to purchase this book to read it.");
    }

    // Generate signed URL
    try {
      const signedUrl = await getSignedPdfUrl(input.bucketPath, 300);
      return { signedUrl, expiresIn: 300 };
    } catch (error) {
      throw new Error("Failed to generate PDF reader URL. Please try again.");
    }
  });

/* ─── Server function: check purchase ownership ────────────────── */

/**
 * Server-side ownership check. Returns { owned: boolean }.
 * Used to gate "Read Now" / purchase buttons.
 */
export const checkBookOwnership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string };
    const owned = await checkOwnership(userId, input.bookId);
    return { owned };
  });

/* ─── Server function: purchase a book ─────────────────────────── */

/**
 * Purchase a book (idempotent). Returns `{ alreadyOwned, purchase }`.
 *
 * For paid books, verifies the book is free (since no payment provider is connected).
 * When a payment provider is added, this function should:
 *   1. Create a payment intent with the provider
 *   2. On payment success, record the purchase
 *   3. Return the purchase result
 */
export const purchaseBookAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: any; userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; amountPaid?: number };

    // Server-side check: verify the book exists and get its price
    const { data: book } = await context.supabase
      .from("books")
      .select("is_free, price")
      .eq("id", input.bookId)
      .maybeSingle();

    if (!book) {
      throw new Error("Book not found.");
    }

    // Payment guard: paid books cannot be purchased without a payment provider
    if (!book.is_free) {
      throw new Error(
        "Payment provider not configured. Please contact the site administrator.",
      );
    }

    // Free books can be purchased directly
    const result = await purchaseBook(userId, input.bookId, 0);

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  });
