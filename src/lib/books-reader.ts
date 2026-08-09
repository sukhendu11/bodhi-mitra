import { createServerFn } from "@tanstack/react-start";
import { requireAuthOrMock } from "@/lib/mock-auth";
import { canAccessPdf, checkOwnership, purchaseBook } from "@/lib/books-purchases";
import { isMockMode } from "@/lib/data-source";
import { getPaymentProvider } from "@/lib/payments";
import { createPaymentOrder, fulfillOrder } from "@/lib/payments/orders";
import { getServerSiteUrl } from "@/lib/site-url";
import { isMockId } from "@/lib/utils";
import { mockFetchPublishedBooks } from "@/lib/mock-data";
import { mockPurchaseBook } from "@/lib/mock-commerce";
import {
  mockAddReaderBookmark,
  mockAddReaderNote,
  mockDeleteReaderNote,
  mockGetReaderBookmarks,
  mockGetReaderNotes,
  mockRemoveReaderBookmark,
  mockUpdateReaderNote,
} from "@/lib/mock-reader";

/* ─── Server function: get signed PDF URL ──────────────────────── */

export const getPdfReaderUrl = createServerFn({ method: "GET" })
  .middleware([requireAuthOrMock])
  .handler(async ({ context, data }: { context: { userId: string | null }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; bucketPath: string; userId?: string };

    // Mock trust boundary: no real JWT in mock mode, client passes demo userId.
    const uid = userId ?? input.userId ?? "";
    const access = await canAccessPdf(uid, input.bookId);
    if (!access.canAccess) {
      throw new Error("Access denied. You need to purchase this book to read it.");
    }

    // Mock mode — the reader serves local/public PDFs directly, so the
    // "signed URL" is just the bucket path (DEV branch uses it verbatim).
    if (isMockMode()) {
      return { signedUrl: input.bucketPath, expiresIn: 300 };
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
  .middleware([requireAuthOrMock])
  .handler(async ({ context, data }: { context: { userId: string | null }; data: unknown }) => {
    const { userId } = context;
    const input = data as { bookId: string; userId?: string };
    const uid = userId ?? input.userId ?? "";
    const owned = await checkOwnership(uid, input.bookId);
    return { owned };
  });

/* ─── Server function: purchase a book ─────────────────────────── */

/**
 * Purchase a single book through the ACTIVE payment provider (AD-026).
 *
 *   free books      → granted immediately (no payment)
 *   paid + simulated → mock purchase recorded directly (inline dev flow)
 *   paid + piprapay  → server-side pending order created, then the payer is
 *                      redirected to the gateway checkout (`{ url }`)
 */
export const purchaseBookAction = createServerFn({ method: "POST" })
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
      const input = data as {
        bookId: string;
        amountPaid?: number;
        bookSlug?: string;
        userId?: string;
      };
      const uid = userId ?? input.userId ?? "";

      // Mock mode (M2 E2.2) — record an idempotent mock purchase directly
      // (the simulated card-form checkout lives in the cart flow).
      if (!ctxSupabase || isMockMode()) {
        const { data: books } = await mockFetchPublishedBooks(1, 100);
        const book = books.find((b) => b.id === input.bookId);
        if (!book) throw new Error("Book not found.");
        if (!book.is_free) {
          return mockPurchaseBook(uid, input.bookId, Number(book.price));
        }
        return mockPurchaseBook(uid, input.bookId, 0);
      }

      const { data: book } = await ctxSupabase
        .from("books")
        .select("is_free, price, slug, title_en, title_bn")
        .eq("id", input.bookId)
        .maybeSingle();

      if (!book) throw new Error("Book not found.");

      if (!book.is_free) {
        const provider = getPaymentProvider();

        // Simulated provider — inline purchase (dev/test), no redirect.
        if (provider.id === "simulated") {
          return mockPurchaseBook(uid, input.bookId, Number(book.price));
        }

        // Redirect provider (e.g. PipraPay) — create a server-side pending
        // order, then send the payer to the gateway. The webhook fulfills it.
        const order = await createPaymentOrder({
          userId: uid,
          provider: provider.id,
          items: [
            {
              bookId: input.bookId,
              titleEn: book.title_en ?? null,
              titleBn: book.title_bn ?? null,
              price: Number(book.price),
            },
          ],
        });
        const result = await provider.createPayment({
          orderId: order.id,
          userId: uid,
          items: order.items,
          amount: order.total,
          discount: 0,
          tax: 0,
          currency: order.currency,
          successUrl: `${getServerSiteUrl()}/books/${input.bookSlug ?? book.slug}?purchase=success`,
          cancelUrl: `${getServerSiteUrl()}/books/${input.bookSlug ?? book.slug}?purchase=cancel`,
        });
        if (result.kind === "redirect") return { url: result.url };
        // Inline (unexpected for a paid single-book path) — grant directly.
        const fulfilled = await fulfillOrder(order.id);
        if (!fulfilled.order) throw new Error("Order not found.");
        return { alreadyOwned: false };
      }

      const result = await purchaseBook(uid, input.bookId, 0);
      if (result.error) throw new Error(result.error);
      return result;
    },
  );

/* ─── Server function: permission-based PDF download ───────────── */

/** Encode bytes as base64 (chunked — stack-safe, no Buffer dependency). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export const downloadBookPdf = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { userId: string | null };
      data: unknown;
    }) => {
      const { userId } = context;
      const input = data as {
        bookId: string;
        bucketPath: string;
        userId?: string;
        filename?: string;
      };
      const uid = userId ?? input.userId ?? "";

      // Permission gate: ownership (or free) required to download.
      const access = await canAccessPdf(uid, input.bookId);
      if (!access.canAccess) {
        throw new Error(
          "Access denied. You need to purchase this book to download it.",
        );
      }

      const filename = input.filename || "book.pdf";

      // Mock mode — read the local/public PDF straight from disk. The bytes
      // travel back base64-encoded inside the JSON response (no %PDF magic
      // bytes on the wire), and the client turns them into a blob URL — so
      // download managers never see a network request to hijack.
      if (isMockMode()) {
        try {
          const { readFile } = await import("node:fs/promises");
          const { join } = await import("node:path");
          const clean = input.bucketPath.replace(/^\/+/, "");
          const bytes = await readFile(join(process.cwd(), "public", clean));
          return { filename, base64: bytesToBase64(new Uint8Array(bytes)) };
        } catch {
          throw new Error("PDF file not found on this server.");
        }
      }

      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: result, error } = await supabaseAdmin.storage
          .from("book-pdfs")
          .createSignedUrl(input.bucketPath, 120);
        if (error) throw error;
        const res = await fetch(result.signedUrl);
        if (!res.ok) throw new Error("Failed to fetch PDF bytes");
        const buf = new Uint8Array(await res.arrayBuffer());
        return { filename, base64: bytesToBase64(buf) };
      } catch {
        throw new Error(
          "Failed to prepare the PDF for download. Please try again.",
        );
      }
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

/* Reader fns below use `requireAuthOrMock` — in mock mode (or for mock
   book ids) they read/write the mock reader store (M3 E3.3); in real mode
   they hit Supabase exactly as before. */

export const getReaderBookmarks = createServerFn({ method: "GET" })
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
      const input = data as { bookId: string; userId?: string };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.bookId)) {
        return mockGetReaderBookmarks(uid, input.bookId);
      }

      const db = ctxSupabase;
      const { data: rows, error } = await db
        .from("reader_bookmarks")
        .select("*")
        .eq("user_id", uid)
        .eq("book_id", input.bookId)
        .order("page_number", { ascending: true });
      if (error) throw error;
      return (rows ?? []) as ReaderBookmark[];
    },
  );

export const addReaderBookmark = createServerFn({ method: "POST" })
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
      const input = data as { bookId: string; pageNumber: number; label?: string; userId?: string };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.bookId)) {
        return mockAddReaderBookmark({
          userId: uid,
          bookId: input.bookId,
          pageNumber: input.pageNumber,
          label: input.label,
        });
      }

      const db = ctxSupabase;
      const { data: row, error } = await db
        .from("reader_bookmarks")
        .insert({
          user_id: uid,
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
    },
  );

export const removeReaderBookmark = createServerFn({ method: "POST" })
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
      const input = data as { id: string; userId?: string };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.id)) {
        return mockRemoveReaderBookmark(uid, input.id);
      }

      const db = ctxSupabase;
      const { error } = await db
        .from("reader_bookmarks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", uid);
      if (error) throw error;
      return { success: true };
    },
  );

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
      const input = data as { bookId: string; userId?: string };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.bookId)) {
        return mockGetReaderNotes(uid, input.bookId);
      }

      const db = ctxSupabase;
      const { data: rows, error } = await db
        .from("reader_notes")
        .select("*")
        .eq("user_id", uid)
        .eq("book_id", input.bookId)
        .order("page_number", { ascending: true });
      if (error) throw error;
      return (rows ?? []) as ReaderNote[];
    },
  );

export const addReaderNote = createServerFn({ method: "POST" })
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
      const input = data as {
        bookId: string;
        pageNumber: number;
        text: string;
        color?: string;
        userId?: string;
      };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.bookId)) {
        return mockAddReaderNote({
          userId: uid,
          bookId: input.bookId,
          pageNumber: input.pageNumber,
          text: input.text,
          color: input.color,
        });
      }

      const db = ctxSupabase;
      const { data: row, error } = await db
        .from("reader_notes")
        .insert({
          user_id: uid,
          book_id: input.bookId,
          page_number: input.pageNumber,
          text: input.text,
          color: input.color ?? "#fef08a",
        })
        .select()
        .single();
      if (error) throw error;
      return row as ReaderNote;
    },
  );

export const deleteReaderNote = createServerFn({ method: "POST" })
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
      const input = data as { id: string; userId?: string };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.id)) {
        return mockDeleteReaderNote(uid, input.id);
      }

      const db = ctxSupabase;
      const { error } = await db
        .from("reader_notes")
        .delete()
        .eq("id", input.id)
        .eq("user_id", uid);
      if (error) throw error;
      return { success: true };
    },
  );

export const updateReaderNote = createServerFn({ method: "POST" })
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
      const input = data as { id: string; text: string; color?: string; userId?: string };
      const uid = userId ?? input.userId ?? "";

      if (!ctxSupabase || isMockMode() || isMockId(input.id)) {
        return mockUpdateReaderNote({ userId: uid, id: input.id, text: input.text, color: input.color });
      }

      const db = ctxSupabase;
      const { data: row, error } = await db
        .from("reader_notes")
        .update({ text: input.text, color: input.color })
        .eq("id", input.id)
        .eq("user_id", uid)
        .select()
        .single();
      if (error) throw error;
      return row as ReaderNote;
    },
  );
