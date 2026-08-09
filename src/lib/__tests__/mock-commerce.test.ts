import { describe, it, expect, beforeEach } from "vitest";
import {
  mockGetOrders,
  mockGetPurchases,
  mockGetAllOrders,
  mockGetAllPurchases,
  mockHasPurchase,
  mockPurchaseBook,
  mockRecordOrder,
} from "@/lib/mock-commerce";
import { mockCheckout, mockAddToCart } from "@/lib/mock-cart";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

/* ─── Clean the mock store between tests ───────────────────────── */

const STORE_KEY = "sabbe-satta-mock-commerce";

beforeEach(() => {
  // Seeding is store-based (idempotent), so clearing the store lets each
  // test start unseeded; the seed re-runs on the next demo-user read.
  localStorage.removeItem(STORE_KEY);
});

/* ════════════════════════════════════════════════════════════════════
   mockRecordOrder
   ════════════════════════════════════════════════════════════════════ */

describe("mockRecordOrder", () => {
  it("creates an order with items and total", async () => {
    const order = await mockRecordOrder("user-1", [
      { bookId: "book-2", titleEn: "Paid Book", titleBn: null, price: 9.99 },
      { bookId: "book-4", titleEn: "Another", titleBn: null, price: 14.99 },
    ]);

    expect(order.userId).toBe("user-1");
    expect(order.status).toBe("paid");
    expect(order.items).toHaveLength(2);
    expect(order.total).toBeCloseTo(24.98);
    expect(order.createdAt).toBeTruthy();
  });

  it("applies a coupon discount to the order total", async () => {
    const order = await mockRecordOrder(
      "user-1",
      [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
      5,
    );
    expect(order.total).toBeCloseTo(4.99);
    // Per-book purchase keeps its full price.
    const purchases = await mockGetPurchases("user-1");
    expect(purchases[0].amountPaid).toBe(9.99);
  });

  it("applies sales tax on the post-discount subtotal", async () => {
    const order = await mockRecordOrder(
      "user-1",
      [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 100 }],
      10, // discount
      5,  // tax rate 5%
    );
    // taxable = 100 - 10 = 90, tax = 90 * 0.05 = 4.5, total = 94.5
    expect(order.discount).toBe(10);
    expect(order.tax).toBeCloseTo(4.5);
    expect(order.total).toBeCloseTo(94.5);
  });

  it("records a purchase per item", async () => {
    await mockRecordOrder("user-1", [
      { bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 },
      { bookId: "book-4", titleEn: "B", titleBn: null, price: 14.99 },
    ]);

    const purchases = await mockGetPurchases("user-1");
    expect(purchases).toHaveLength(2);
    expect(purchases.map((p) => p.bookId).sort()).toEqual(["book-2", "book-4"]);
    expect(purchases[0].amountPaid).toBe(9.99);
  });

  it("skips already-owned books when recording an order", async () => {
    await mockRecordOrder("user-1", [
      { bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 },
    ]);
    // Second checkout of the same book — no duplicate purchase row.
    await mockRecordOrder("user-1", [
      { bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 },
    ]);

    const purchases = await mockGetPurchases("user-1");
    expect(purchases).toHaveLength(1);
  });

  it("scopes orders per user", async () => {
    await mockRecordOrder("user-1", [
      { bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 },
    ]);
    const otherOrders = await mockGetOrders("user-2");
    expect(otherOrders).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════
   mockPurchaseBook
   ════════════════════════════════════════════════════════════════════ */

describe("mockPurchaseBook", () => {
  it("records a single-book purchase", async () => {
    const result = await mockPurchaseBook("user-1", "book-2", 9.99);
    expect(result.alreadyOwned).toBe(false);
    expect(result.purchase?.bookId).toBe("book-2");
    expect(result.purchase?.amountPaid).toBe(9.99);
    expect(await mockHasPurchase("user-1", "book-2")).toBe(true);
  });

  it("is idempotent — returns alreadyOwned on repeat", async () => {
    await mockPurchaseBook("user-1", "book-2", 9.99);
    const second = await mockPurchaseBook("user-1", "book-2", 9.99);
    expect(second.alreadyOwned).toBe(true);
    const purchases = await mockGetPurchases("user-1");
    expect(purchases).toHaveLength(1);
  });

  it("defaults amountPaid to 0 (free books)", async () => {
    const result = await mockPurchaseBook("user-1", "book-1");
    expect(result.purchase?.amountPaid).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════════════
   mockCheckout (cart → order + purchases + clear)
   ════════════════════════════════════════════════════════════════════ */

describe("mockCheckout", () => {
  it("records an order from the cart and clears it", async () => {
    await mockAddToCart("book-2");
    await mockAddToCart("book-4");

    const result = await mockCheckout("user-1");

    expect(result.order.items).toHaveLength(2);
    expect(result.itemCount).toBe(2);
    expect(result.total).toBeGreaterThan(0);
    expect(await mockHasPurchase("user-1", "book-2")).toBe(true);
    expect(await mockHasPurchase("user-1", "book-4")).toBe(true);

    // Cart is cleared after checkout.
    const { mockGetCart } = await import("@/lib/mock-cart");
    const cart = await mockGetCart();
    expect(cart.itemCount).toBe(0);
  });

  it("throws when the cart is empty", async () => {
    await expect(mockCheckout("user-1")).rejects.toThrow("Your cart is empty.");
  });
});

/* ════════════════════════════════════════════════════════════════════
   Seed (ROADMAP §2.3 — demo user starts with 2 purchased books)
   ════════════════════════════════════════════════════════════════════ */

describe("seeded demo purchases", () => {
  it("seeds 2 paid purchases for the demo user on first read", async () => {
    const purchases = await mockGetPurchases(DEMO_ACCOUNTS.user.id);
    expect(purchases.length).toBeGreaterThanOrEqual(2);
    expect(purchases.every((p) => p.bookId.startsWith("book-"))).toBe(true);
  });

  it("does not seed purchases for other users", async () => {
    const purchases = await mockGetPurchases("some-other-user");
    expect(purchases).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════
   M5 — admin aggregates
   ════════════════════════════════════════════════════════════════════ */

describe("mockGetAllOrders / mockGetAllPurchases (M5 admin)", () => {
  it("returns every order across users with the demo seed present", async () => {
    // Record an order for a second user so "all" is broader than "mine".
    await mockRecordOrder("user-2", [
      { bookId: "book-2", titleEn: "Walking the Middle Way", titleBn: "মধ্যম পথে হাঁটা", price: 1799 },
    ]);
    const all = await mockGetAllOrders();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((o) => o.userId === "user-2")).toBe(true);
    expect(all.every((o) => o.status === "paid")).toBe(true);
    // Newest first
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].createdAt >= all[i].createdAt).toBe(true);
    }
  });

  it("aggregates purchases across users and sums revenue", async () => {
    await mockRecordOrder("user-2", [
      { bookId: "book-2", titleEn: "Walking the Middle Way", titleBn: "মধ্যম পথে হাঁটা", price: 1799 },
    ]);
    const all = await mockGetAllPurchases();
    const revenue = all.reduce((s, p) => s + p.amountPaid, 0);
    expect(all.some((p) => p.userId === "user-2")).toBe(true);
    expect(revenue).toBeGreaterThan(0);
  });
});
