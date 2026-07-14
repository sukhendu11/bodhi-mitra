import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canAccessPdf, checkOwnership, purchaseBook } from "@/lib/books-purchases";
import { supabase } from "@/integrations/supabase/client";

/* ─── Server function: get signed PDF URL ──────────────────────── */

export const getPdfReaderUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; bucketPath: string };

    const access = await canAccessPdf(userId, input.bookId);
    if (!access.canAccess) {
      throw new Error("Access denied. You need to purchase this book to read it.");
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: result, error } = await supabaseAdmin.storage
        .from("book-pdfs")
        .createSignedUrl(input.bucketPath, 300);
      if (error) throw error;
      return { signedUrl: result.signedUrl, expiresIn: 300 };
    } catch (error) {
      throw new Error("Failed to generate PDF reader URL. Please try again.");
    }
  });

/* ─── Server function: check purchase ownership ────────────────── */

export const checkBookOwnership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string };
    const owned = await checkOwnership(userId, input.bookId);
    return { owned };
  });

/* ─── Server function: purchase a book ─────────────────────────── */

export const purchaseBookAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context, data }: { context: { supabase: any; userId: string }; data: unknown }) => {
      const { userId } = context;
      const input = data as { bookId: string; amountPaid?: number; bookSlug?: string };

      const { data: book } = await context.supabase
        .from("books")
        .select("is_free, price, slug")
        .eq("id", input.bookId)
        .maybeSingle();

      if (!book) throw new Error("Book not found.");

      if (!book.is_free) {
        const { createCheckoutSession } = await import("@/lib/stripe-checkout");
        const result = await (createCheckoutSession as any)({
          data: { bookId: input.bookId, bookSlug: input.bookSlug ?? book.slug },
        });
        return { url: result.url };
      }

      const result = await purchaseBook(userId, input.bookId, 0);
      if (result.error) throw new Error(result.error);
      return result;
    },
  );

/* ════════════════════════════════════════════════════════════════════
   Reader Page Bookmarks
   ════════════════════════════════════════════════════════════════════ */

export interface ReaderBookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  label: string;
  created_at: string;
}

export const getReaderBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string };
    const db = supabase as any;
    const { data: rows, error } = await db
      .from("reader_bookmarks")
      .select("*")
      .eq("user_id", userId)
      .eq("book_id", input.bookId)
      .order("page_number", { ascending: true });
    if (error) throw error;
    return (rows ?? []) as ReaderBookmark[];
  });

export const addReaderBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; pageNumber: number; label?: string };
    const db = supabase as any;
    const { data: row, error } = await db
      .from("reader_bookmarks")
      .insert({
        user_id: userId,
        book_id: input.bookId,
        page_number: input.pageNumber,
        label: input.label ?? "",
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return { alreadyExists: true };
      throw error;
    }
    return row as ReaderBookmark;
  });

export const removeReaderBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { id: string };
    const db = supabase as any;
    const { error } = await db
      .from("reader_bookmarks")
      .delete()
      .eq("id", input.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });

/* ════════════════════════════════════════════════════════════════════
   Reader Notes
   ════════════════════════════════════════════════════════════════════ */

export interface ReaderNote {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  text: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export const getReaderNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string };
    const db = supabase as any;
    const { data: rows, error } = await db
      .from("reader_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("book_id", input.bookId)
      .order("page_number", { ascending: true });
    if (error) throw error;
    return (rows ?? []) as ReaderNote[];
  });

export const addReaderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; pageNumber: number; text: string; color?: string };
    const db = supabase as any;
    const { data: row, error } = await db
      .from("reader_notes")
      .insert({
        user_id: userId,
        book_id: input.bookId,
        page_number: input.pageNumber,
        text: input.text,
        color: input.color ?? "#fef08a",
      })
      .select()
      .single();
    if (error) throw error;
    return row as ReaderNote;
  });

export const deleteReaderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { id: string };
    const db = supabase as any;
    const { error } = await db
      .from("reader_notes")
      .delete()
      .eq("id", input.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });

export const updateReaderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { id: string; text: string; color?: string };
    const db = supabase as any;
    const { data: row, error } = await db
      .from("reader_notes")
      .update({ text: input.text, color: input.color })
      .eq("id", input.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return row as ReaderNote;
  });
