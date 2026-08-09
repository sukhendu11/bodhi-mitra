/**
 * Orders / receipts — user-facing order history (mock-first seam).
 *
 * The `orders` table does not exist in the Supabase schema yet (mock is the
 * source of truth for receipts, per mock-first dev). In mock mode this reads
 * `mockGetOrders`; in real mode it derives per-purchase receipts from the
 * `purchases` table until a dedicated `orders` table lands (documented in
 * ARCHITECTURE.md Adapter Contract).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuthOrMock } from "@/lib/mock-auth";
import { isMockMode } from "@/lib/data-source";
import { mockGetOrders, type MockOrder } from "@/lib/mock-commerce";
import { supabase } from "@/integrations/supabase/client";

/* ─── Public receipt shape ─────────────────────────────────────── */

export interface OrderReceiptItem {
  bookId: string;
  titleEn: string | null;
  titleBn: string | null;
  price: number;
}

export interface OrderReceipt {
  id: string;
  createdAt: string;
  items: OrderReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/* ─── Mappers ──────────────────────────────────────────────────── */

function mockToReceipt(order: MockOrder): OrderReceipt {
  const subtotal = order.items.reduce((sum, i) => sum + i.price, 0);
  return {
    id: order.id,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      bookId: i.bookId,
      titleEn: i.titleEn,
      titleBn: i.titleBn,
      price: i.price,
    })),
    subtotal,
    discount: order.discount ?? 0,
    tax: order.tax ?? 0,
    total: order.total,
  };
}

/* ─── Server fn ────────────────────────────────────────────────── */

export const getOrders = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { userId: string | null; supabase: any };
      data: unknown;
    }) => {
      const { supabase: sb, userId: ctxUserId } = context;
      const input = (data ?? {}) as { userId?: string };
      // Mock trust boundary: no real JWT in mock mode, so the client passes the
      // demo userId for attribution. Real mode uses the validated JWT.
      const userId = ctxUserId ?? input.userId ?? "";
      if (!userId) return [] as OrderReceipt[];

      if (isMockMode()) {
        const orders = await mockGetOrders(userId);
        return orders.map(mockToReceipt);
      }

      // Real mode — no `orders` table yet; derive one-item receipts from the
      // `purchases` table. Swap for the real orders query when the table lands.
      const { data: purchases, error } = await sb
        .from("purchases")
        .select("id, book_id, amount_paid, purchase_date")
        .eq("user_id", userId)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      const rows = (purchases ?? []) as {
        id: string;
        book_id: string;
        amount_paid: number;
        purchase_date: string;
      }[];
      if (!rows.length) return [] as OrderReceipt[];

      const bookIds = rows.map((p) => p.book_id);
      const { data: books } = await sb
        .from("books")
        .select("id, title_en, title_bn")
        .in("id", bookIds);
      const bookMap = new Map((books ?? []).map((b: any) => [b.id, b]));

      return rows.map((row): OrderReceipt => {
        const book = (bookMap.get(row.book_id) ?? {}) as { title_en?: string; title_bn?: string };
        const price = Number(row.amount_paid);
        return {
          id: row.id,
          createdAt: row.purchase_date,
          items: [
            {
              bookId: row.book_id,
              titleEn: book.title_en ?? null,
              titleBn: book.title_bn ?? null,
              price,
            },
          ],
          subtotal: price,
          discount: 0,
          tax: 0,
          total: price,
        };
      });
    },
  );
