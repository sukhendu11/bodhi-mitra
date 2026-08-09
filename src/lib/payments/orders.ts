/**
 * Server-side payment order service — the single place order state is
 * managed for the provider-agnostic payment flow (AD-026).
 *
 * Order lifecycle (server-side only, never trusted to the client):
 *
 *   1. `createPaymentOrder`  → order created as `pending`
 *   2. `initiateProviderPayment` → simulated (inline) OR redirect (PipraPay)
 *   3. Terminal transition (webhook OR simulated completion):
 *        paid      → `fulfillOrder` grants purchases + clears cart + emails
 *        failed    → `failOrder`
 *        cancelled → `cancelOrder`
 *
 * Duplicate callbacks are protected by the idempotent status transition in
 * the store (`mockTransitionOrderStatus` only moves `pending → X`).
 *
 * NOTE: mock-first dev — order rows live in the mock-commerce store. When the
 * Supabase `orders` table lands (P3), only this file's store calls change.
 */
import { isMockMode } from "@/lib/data-source";
import {
  mockCreatePendingOrder,
  mockGetOrderById,
  mockTransitionOrderStatus,
  mockGetAllOrders,
  type MockOrder,
  type MockOrderItem,
} from "@/lib/mock-commerce";
import { mockClearCart, mockGetCart } from "@/lib/mock-cart";
import { mockPurchaseBook } from "@/lib/mock-commerce";
import type {
  PaymentOrder,
  PaymentOrderItem,
  PaymentOrderStatus,
} from "./types";

/* ─── Shape mapping ────────────────────────────────────────────── */

function toPaymentOrder(order: MockOrder): PaymentOrder {
  return {
    id: order.id,
    userId: order.userId,
    items: order.items.map(
      (i: MockOrderItem): PaymentOrderItem => ({
        bookId: i.bookId,
        titleEn: i.titleEn,
        titleBn: i.titleBn,
        price: i.price,
      }),
    ),
    discount: order.discount ?? 0,
    tax: order.tax ?? 0,
    total: order.total,
    currency: "BDT",
    status: order.status,
    provider: (order.provider ?? "simulated") as PaymentOrder["provider"],
    gatewayReference: order.gatewayReference ?? null,
    couponId: order.couponId ?? null,
    createdAt: order.createdAt,
    paidAt: order.completedAt ?? null,
  };
}

/* ─── Create (pending) ─────────────────────────────────────────── */

export interface CreateOrderInput {
  userId: string;
  items: PaymentOrderItem[];
  discount?: number;
  taxRate?: number;
  provider: string;
  couponId?: string | null;
}

/** Create a server-side `pending` order (before the payer reaches a gateway). */
export async function createPaymentOrder(
  input: CreateOrderInput,
): Promise<PaymentOrder> {
  const order = await mockCreatePendingOrder(
    input.userId,
    input.items.map((i) => ({
      bookId: i.bookId,
      titleEn: i.titleEn,
      titleBn: i.titleBn,
      price: i.price,
    })),
    input.discount ?? 0,
    input.taxRate ?? 0,
    { provider: input.provider, couponId: input.couponId ?? null },
  );
  return toPaymentOrder(order);
}

/* ─── Reads ────────────────────────────────────────────────────── */

export async function getPaymentOrder(orderId: string): Promise<PaymentOrder | null> {
  const order = await mockGetOrderById(orderId);
  return order ? toPaymentOrder(order) : null;
}

/** Admin aggregate (orders view / dashboard). */
export async function getAllPaymentOrders(): Promise<PaymentOrder[]> {
  const orders = await mockGetAllOrders();
  return orders.map(toPaymentOrder);
}

/* ─── Terminal transitions ─────────────────────────────────────── */

/**
 * Fulfill a `pending` order: verify it exists, verify the paid amount (when
 * the gateway reports one) matches the server-side order total, transition it
 * to `paid`, grant purchases for each item (idempotent per book), clear the
 * cart, and notify.
 *
 * This is the provider-agnostic "payment verified" handler — used by BOTH the
 * simulated completion and the real IPN webhook path.
 *
 * **Amount verification (fraud control):** when `amountPaid` is supplied by
 * the gateway webhook, it MUST match the server-side order total (within a
 * small tolerance for gateway rounding). A mismatch rejects the fulfillment
 * and marks the order `failed` — the gateway's signature proves the callback
 * came from the gateway, but the amount check proves it paid for THIS order.
 *
 * Mode-aware:
 *  - mock mode → grants via the mock-commerce store (dev/test)
 *  - real mode → grants via Supabase (`purchases` insert + cart clear), the
 *    same write path the legacy Stripe webhook used.
 *
 * @returns `{ fulfilled, alreadyProcessed, rejected, order }`
 */
const AMOUNT_TOLERANCE = 1; // BDT — covers gateway rounding to whole taka

export async function fulfillOrder(
  orderId: string,
  opts: { gatewayReference?: string | null; amountPaid?: number } = {},
): Promise<{
  fulfilled: boolean;
  alreadyProcessed: boolean;
  rejected: "amount-mismatch" | null;
  order: PaymentOrder | null;
}> {
  const current = await mockGetOrderById(orderId);
  if (!current) return { fulfilled: false, alreadyProcessed: false, rejected: null, order: null };

  // Duplicate callback / already terminal → no-op.
  if (current.status !== "pending") {
    return {
      fulfilled: current.status === "paid",
      alreadyProcessed: true,
      rejected: null,
      order: toPaymentOrder(current),
    };
  }

  // Amount must match the server-side total (when the gateway reports one).
  if (
    opts.amountPaid !== undefined &&
    opts.amountPaid !== null &&
    Math.abs(Number(opts.amountPaid) - current.total) > AMOUNT_TOLERANCE
  ) {
    // Reject — mark the order failed so a later retry cannot fulfill it.
    await mockTransitionOrderStatus(orderId, "failed", {
      gatewayReference: opts.gatewayReference ?? null,
    });
    const failed = await mockGetOrderById(orderId);
    return {
      fulfilled: false,
      alreadyProcessed: false,
      rejected: "amount-mismatch",
      order: failed ? toPaymentOrder(failed) : null,
    };
  }

  if (isMockMode()) {
    // Grant purchases (mock purchase per item — skips already-owned books).
    for (const item of current.items) {
      await mockPurchaseBook(current.userId, item.bookId, item.price);
    }

    // Clear the cart that produced this order.
    try {
      const cart = await mockGetCart();
      if (cart.itemCount > 0) await mockClearCart();
    } catch {
      // Cart clearing is best-effort — fulfillment must not fail on it.
    }
  } else {
    // Real mode — grant via Supabase (same as the legacy Stripe webhook).
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server",
      );
      const db = supabaseAdmin as any;

      for (const item of current.items) {
        const { error } = await db.from("purchases").insert({
          user_id: current.userId,
          book_id: item.bookId,
          amount_paid: item.price,
          purchase_date: new Date().toISOString(),
        });
        // 23505 = duplicate purchase (already owned) — not an error.
        if (error && error.code !== "23505") {
          console.error("[payments/orders] purchase insert failed", error);
        }
      }

      // Clear the user's cart.
      const { data: cart } = await db
        .from("carts")
        .select("id")
        .eq("user_id", current.userId)
        .maybeSingle();
      if (cart) {
        await db.from("cart_items").delete().eq("cart_id", cart.id);
      }

      // Fire-and-forget purchase confirmation emails.
      for (const item of current.items) {
        const { sendPurchaseConfirmation } = await import(
          "@/lib/purchase-emails",
        );
        sendPurchaseConfirmation({
          userId: current.userId,
          bookId: item.bookId,
          amountPaid: item.price,
          isFree: false,
        }).catch((err) => {
          console.error("[payments/orders] purchase email failed", err);
        });
      }

      // Increment coupon redemption if one was applied.
      if (current.couponId) {
        const { incrementRedemption } = await import("@/lib/coupons");
        incrementRedemption(current.couponId).catch((err) => {
          console.error("[payments/orders] coupon increment failed", err);
        });
      }
    } catch (error) {
      console.error("[payments/orders] real-mode fulfillment error", error);
      throw new Error("Failed to grant purchases for the verified payment.");
    }
  }

  const { order } = await mockTransitionOrderStatus(orderId, "paid", {
    gatewayReference: opts.gatewayReference ?? null,
  });

  return {
    fulfilled: true,
    alreadyProcessed: false,
    rejected: null,
    order: order ? toPaymentOrder(order) : null,
  };
}

/** Mark a `pending` order failed (webhook status `failed`). */
export async function failOrder(
  orderId: string,
  opts: { gatewayReference?: string | null } = {},
): Promise<{ order: PaymentOrder | null; changed: boolean }> {
  const { order, changed } = await mockTransitionOrderStatus(orderId, "failed", {
    gatewayReference: opts.gatewayReference ?? null,
  });
  return { order: order ? toPaymentOrder(order) : null, changed };
}

/** Mark a `pending` order cancelled (user left the gateway). */
export async function cancelOrder(
  orderId: string,
  opts: { gatewayReference?: string | null } = {},
): Promise<{ order: PaymentOrder | null; changed: boolean }> {
  const { order, changed } = await mockTransitionOrderStatus(orderId, "cancelled", {
    gatewayReference: opts.gatewayReference ?? null,
  });
  return { order: order ? toPaymentOrder(order) : null, changed };
}

/* ─── Status helper ────────────────────────────────────────────── */

export function isTerminalStatus(status: PaymentOrderStatus): boolean {
  return status === "paid" || status === "failed" || status === "cancelled";
}

/* ─── Mock seam for tests (in-memory store is shared with mock-commerce) ── */

export { isMockMode };
