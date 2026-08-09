import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/* ─── Clean the mock store between tests ───────────────────────── */

const STORE_KEY = "sabbe-satta-mock-commerce";

beforeEach(() => {
  localStorage.removeItem(STORE_KEY);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ════════════════════════════════════════════════════════════════════
   Provider registry
   ════════════════════════════════════════════════════════════════════ */

describe("provider registry", () => {
  it("defaults to the simulated provider", async () => {
    const prev = process.env.PAYMENT_PROVIDER;
    delete process.env.PAYMENT_PROVIDER;
    try {
      const { getPaymentProvider } = await import("@/lib/payments");
      expect(getPaymentProvider().id).toBe("simulated");
    } finally {
      process.env.PAYMENT_PROVIDER = prev;
    }
  });

  it("selects piprapay when PAYMENT_PROVIDER=piprapay", async () => {
    const prev = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = "piprapay";
    try {
      const { getPaymentProvider } = await import("@/lib/payments");
      expect(getPaymentProvider().id).toBe("piprapay");
    } finally {
      process.env.PAYMENT_PROVIDER = prev;
    }
  });

  it("isLivePaymentsActive is false unless piprapay is configured", async () => {
    const prev = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = "piprapay";
    try {
      const { isLivePaymentsActive } = await import("@/lib/payments");
      expect(isLivePaymentsActive()).toBe(false); // no PIPRAPAY_* env set
    } finally {
      process.env.PAYMENT_PROVIDER = prev;
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
   Simulated provider
   ════════════════════════════════════════════════════════════════════ */

describe("simulatedProvider", () => {
  it("returns an inline (simulated) payment result", async () => {
    const { simulatedProvider } = await import("@/lib/payments/simulated");
    const result = await simulatedProvider.createPayment({
      orderId: "order-1",
      userId: "user-1",
      items: [{ bookId: "book-1", titleEn: "A", titleBn: null, price: 100 }],
      amount: 100,
      discount: 0,
      tax: 0,
      currency: "BDT",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });
    expect(result.kind).toBe("simulated");
    if (result.kind === "simulated") {
      expect(result.orderId).toBe("order-1");
      expect(result.amount).toBe(100);
    }
  });

  it("parses a paid webhook payload", async () => {
    const { simulatedProvider } = await import("@/lib/payments/simulated");
    const event = await simulatedProvider.verifyWebhook(
      JSON.stringify({ orderId: "order-1", status: "paid", trx_id: "TRX1", amount: 100 }),
      new Headers(),
    );
    expect(event).not.toBeNull();
    expect(event?.status).toBe("paid");
    expect(event?.orderId).toBe("order-1");
    expect(event?.gatewayReference).toBe("TRX1");
    expect(event?.amountPaid).toBe(100);
  });

  it("parses failed / cancelled statuses", async () => {
    const { simulatedProvider } = await import("@/lib/payments/simulated");
    const failed = await simulatedProvider.verifyWebhook(
      JSON.stringify({ orderId: "order-1", status: "failed" }),
      new Headers(),
    );
    expect(failed?.status).toBe("failed");

    const cancelled = await simulatedProvider.verifyWebhook(
      JSON.stringify({ orderId: "order-1", status: "cancelled" }),
      new Headers(),
    );
    expect(cancelled?.status).toBe("cancelled");
  });

  it("returns null for unverifiable payloads", async () => {
    const { simulatedProvider } = await import("@/lib/payments/simulated");
    expect(await simulatedProvider.verifyWebhook("not json", new Headers())).toBeNull();
    expect(
      await simulatedProvider.verifyWebhook(JSON.stringify({ status: "weird" }), new Headers()),
    ).toBeNull();
    expect(
      await simulatedProvider.verifyWebhook(JSON.stringify({ orderId: "order-1", status: "mystery" }), new Headers()),
    ).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════
   PipraPay provider (env-driven, no live server needed)
   ════════════════════════════════════════════════════════════════════ */

describe("piprapayProvider", () => {
  it("is not configured without env vars", async () => {
    // Ensure no PIPRAPAY_* vars leak from the environment.
    const { piprapayProvider } = await import("@/lib/payments/piprapay");
    expect(piprapayProvider.isConfigured()).toBe(false);
  });

  it("throws a descriptive error when createPayment is called unconfigured", async () => {
    const { piprapayProvider } = await import("@/lib/payments/piprapay");
    await expect(
      piprapayProvider.createPayment({
        orderId: "order-1",
        userId: "user-1",
        items: [],
        amount: 100,
        discount: 0,
        tax: 0,
        currency: "BDT",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      }),
    ).rejects.toThrow(/PipraPay is not configured/);
  });

  it("rejects unsigned webhook payloads", async () => {
    const { piprapayProvider } = await import("@/lib/payments/piprapay");
    const event = await piprapayProvider.verifyWebhook(
      JSON.stringify({ order_id: "order-1", status: "paid" }),
      new Headers(),
    );
    expect(event).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Server-side order lifecycle
   ════════════════════════════════════════════════════════════════════ */

describe("payment order lifecycle", () => {
  it("creates a pending order and fulfills it (grants purchases)", async () => {
    const { createPaymentOrder, fulfillOrder } = await import("@/lib/payments/orders");
    const { mockGetPurchases, mockGetOrderById } = await import("@/lib/mock-commerce");

    const order = await createPaymentOrder({
      userId: "user-1",
      provider: "simulated",
      items: [
        { bookId: "book-2", titleEn: "Paid Book", titleBn: null, price: 9.99 },
        { bookId: "book-4", titleEn: "Another", titleBn: null, price: 14.99 },
      ],
      discount: 5,
      taxRate: 5,
    });

    expect(order.status).toBe("pending");
    expect(order.total).toBeCloseTo((24.98 - 5) * 1.05); // (subtotal - discount) + 5% tax

    const fulfilled = await fulfillOrder(order.id);
    expect(fulfilled.fulfilled).toBe(true);
    expect(fulfilled.alreadyProcessed).toBe(false);
    expect(fulfilled.order?.status).toBe("paid");

    const purchases = await mockGetPurchases("user-1");
    expect(purchases).toHaveLength(2);
    expect(purchases.map((p) => p.bookId).sort()).toEqual(["book-2", "book-4"]);
  });

  it("duplicate fulfillment is a no-op (idempotent)", async () => {
    const { createPaymentOrder, fulfillOrder } = await import("@/lib/payments/orders");
    const { mockGetPurchases } = await import("@/lib/mock-commerce");

    const order = await createPaymentOrder({
      userId: "user-1",
      provider: "simulated",
      items: [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
    });

    await fulfillOrder(order.id);
    const second = await fulfillOrder(order.id);

    expect(second.alreadyProcessed).toBe(true);
    expect(second.fulfilled).toBe(true); // already paid → still reported as fulfilled
    const purchases = await mockGetPurchases("user-1");
    expect(purchases).toHaveLength(1); // no duplicate purchase rows
  });

  it("fulfilling an unknown order returns order null", async () => {
    const { fulfillOrder } = await import("@/lib/payments/orders");
    const result = await fulfillOrder("order-does-not-exist");
    expect(result.order).toBeNull();
    expect(result.fulfilled).toBe(false);
  });

  it("fail and cancel transitions mark the order terminal", async () => {
    const { createPaymentOrder, failOrder, cancelOrder, getPaymentOrder } = await import(
      "@/lib/payments/orders"
    );

    const failed = await createPaymentOrder({
      userId: "user-1",
      provider: "piprapay",
      items: [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
    });
    const failedResult = await failOrder(failed.id, { gatewayReference: "TRX-fail" });
    expect(failedResult.order?.status).toBe("failed");
    expect(failedResult.changed).toBe(true);
    expect((await getPaymentOrder(failed.id))?.gatewayReference).toBe("TRX-fail");

    const cancelled = await createPaymentOrder({
      userId: "user-1",
      provider: "piprapay",
      items: [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
    });
    await cancelOrder(cancelled.id);
    expect((await getPaymentOrder(cancelled.id))?.status).toBe("cancelled");
  });

  it("a failed order cannot be fulfilled (idempotent guard)", async () => {
    const { createPaymentOrder, failOrder, fulfillOrder } = await import("@/lib/payments/orders");
    const order = await createPaymentOrder({
      userId: "user-1",
      provider: "piprapay",
      items: [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
    });
    await failOrder(order.id);
    const result = await fulfillOrder(order.id);
    expect(result.fulfilled).toBe(false);
    expect(result.alreadyProcessed).toBe(true); // terminal state blocks re-processing
  });

  it("rejects fulfillment when the paid amount mismatches the order total", async () => {
    const { createPaymentOrder, fulfillOrder } = await import("@/lib/payments/orders");
    const { mockGetPurchases } = await import("@/lib/mock-commerce");

    const order = await createPaymentOrder({
      userId: "user-1",
      provider: "piprapay",
      items: [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
    });

    // Gateway reports a different amount than the server-side total.
    const rejected = await fulfillOrder(order.id, { amountPaid: order.total + 50 });
    expect(rejected.fulfilled).toBe(false);
    expect(rejected.rejected).toBe("amount-mismatch");
    expect(rejected.order?.status).toBe("failed"); // marked failed — no retry can fulfill

    // No purchases were granted.
    const purchases = await mockGetPurchases("user-1");
    expect(purchases).toHaveLength(0);
  });

  it("accepts a paid amount within the rounding tolerance", async () => {
    const { createPaymentOrder, fulfillOrder } = await import("@/lib/payments/orders");
    const { mockGetPurchases } = await import("@/lib/mock-commerce");

    const order = await createPaymentOrder({
      userId: "user-1",
      provider: "piprapay",
      items: [{ bookId: "book-2", titleEn: "A", titleBn: null, price: 9.99 }],
    });

    const ok = await fulfillOrder(order.id, { amountPaid: Math.round(order.total) });
    expect(ok.fulfilled).toBe(true);
    expect(ok.rejected).toBeNull();
    expect(ok.order?.status).toBe("paid");
    expect(await mockGetPurchases("user-1")).toHaveLength(1);
  });
});
