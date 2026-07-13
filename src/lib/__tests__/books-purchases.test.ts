import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mock Supabase client ─────────────────────────────────────── */

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: "https://example.com/signed" }, error: null }),
        ),
      })),
    },
  },
}));

/* ─── Helper: build thenable chain mock ─────────────────────────── */

function makeChainable() {
  const chain: Record<string, any> = {};
  let resolveValue: any = { data: null, error: null, count: 0 };
  let currentPromise: Promise<any> | null = null;

  const getPromise = () => {
    if (!currentPromise) currentPromise = Promise.resolve(resolveValue);
    return currentPromise;
  };

  // Make chain thenable
  chain.then = (onfulfilled: any, onrejected: any) => getPromise().then(onfulfilled, onrejected);
  chain.catch = (onrejected: any) => getPromise().catch(onrejected);

  chain.__setResult = (data: any) => {
    resolveValue = data;
    currentPromise = null;
  };

  const methods = ["select", "eq", "in", "or", "order", "range", "maybeSingle", "single", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  // insert → select → single
  chain.insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  }));

  // update → eq → select → single
  chain.update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  }));

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─── Import functions after mocks are set up ──────────────────── */

const { canAccessPdf, checkOwnership, purchaseBook, getBookPurchaseStats } =
  await import("../books-purchases");

/* ════════════════════════════════════════════════════════════════════
   canAccessPdf
   ════════════════════════════════════════════════════════════════════ */

describe("canAccessPdf", () => {
  it("returns unauthenticated when userId is null", async () => {
    const result = await canAccessPdf(null, "book-123");
    expect(result).toEqual({ canAccess: false, reason: "unauthenticated" });
  });

  it("returns unauthenticated when userId is undefined", async () => {
    const result = await canAccessPdf(undefined, "book-123");
    expect(result).toEqual({ canAccess: false, reason: "unauthenticated" });
  });

  it("returns not_purchased when book not found", async () => {
    const chain = makeChainable();
    const chains = [makeChainable(), makeChainable()];
    chains[0].__setResult({ data: null, error: null }); // book query
    chains[1].__setResult({ data: null, error: null }); // fallback
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      const c = chains[Math.min(callIdx++, chains.length - 1)];
      return c;
    });

    const result = await canAccessPdf("user-1", "nonexistent-book");
    expect(result).toEqual({ canAccess: false, reason: "not_purchased" });
    // First call should be on "books" table
  });

  it("returns free access for free books", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: { is_free: true, status: "published" }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await canAccessPdf("user-1", "free-book-123");
    expect(result).toEqual({ canAccess: true, reason: "free" });
  });

  it("returns admin access for admin users", async () => {
    // First call: books table → paid book
    // Second call: user_roles table → admin role
    // Third call: purchases (not reached)
    const bookChain = makeChainable();
    bookChain.__setResult({ data: { is_free: false, status: "published" }, error: null });

    const roleChain = makeChainable();
    roleChain.__setResult({ data: { role: "admin" }, error: null });

    const fallback = makeChainable();
    fallback.__setResult({ data: null, error: null });

    const chains = [bookChain, roleChain, fallback];
    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    const result = await canAccessPdf("admin-user", "paid-book-123");
    expect(result).toEqual({ canAccess: true, reason: "admin" });
  });

  it("returns owned access for users who purchased the book", async () => {
    const chains = [
      makeChainable(), // books table
      makeChainable(), // user_roles table
      makeChainable(), // purchases table
    ];
    chains[0].__setResult({ data: { is_free: false, status: "published" }, error: null });
    chains[1].__setResult({ data: null, error: null }); // not admin
    chains[2].__setResult({ data: { id: "purchase-1" }, error: null }); // purchased

    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    const result = await canAccessPdf("buyer-user", "paid-book-123");
    expect(result).toEqual({ canAccess: true, reason: "owned" });
  });

  it("returns not_purchased for unpaid paid books", async () => {
    const chains = [makeChainable(), makeChainable(), makeChainable()];
    chains[0].__setResult({ data: { is_free: false, status: "published" }, error: null });
    chains[1].__setResult({ data: null, error: null }); // not admin
    chains[2].__setResult({ data: null, error: null }); // not purchased

    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    const result = await canAccessPdf("non-buyer", "paid-book-123");
    expect(result).toEqual({ canAccess: false, reason: "not_purchased" });
  });
});

/* ════════════════════════════════════════════════════════════════════
   checkOwnership
   ════════════════════════════════════════════════════════════════════ */

describe("checkOwnership", () => {
  it("returns false when userId is null", async () => {
    expect(await checkOwnership(null, "book-123")).toBe(false);
  });

  it("returns false when userId is undefined", async () => {
    expect(await checkOwnership(undefined, "book-123")).toBe(false);
  });

  it("returns true for free books", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: { is_free: true }, error: null });
    mockFrom.mockReturnValue(chain);

    expect(await checkOwnership("user-1", "free-book")).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("books");
  });

  it("returns true for purchased books", async () => {
    const bookChain = makeChainable();
    bookChain.__setResult({ data: { is_free: false }, error: null });

    const purchaseChain = makeChainable();
    purchaseChain.__setResult({ data: { id: "purchase-1" }, error: null });

    const chains = [bookChain, purchaseChain];
    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    expect(await checkOwnership("user-1", "paid-book")).toBe(true);
  });

  it("returns false for non-purchased paid books", async () => {
    const bookChain = makeChainable();
    bookChain.__setResult({ data: { is_free: false }, error: null });

    const purchaseChain = makeChainable();
    purchaseChain.__setResult({ data: null, error: null });

    const chains = [bookChain, purchaseChain];
    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    expect(await checkOwnership("user-1", "paid-book")).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════════
   purchaseBook
   ════════════════════════════════════════════════════════════════════ */

describe("purchaseBook", () => {
  it("creates a new purchase for a book not yet owned", async () => {
    // First call: check existing purchase → null (not owned)
    // Second call: insert → new purchase
    const checkChain = makeChainable();
    checkChain.__setResult({ data: null, error: null });

    mockFrom.mockReturnValueOnce(checkChain);

    // For the insert call, create a fresh chain that returns the purchase data
    const insertChain = makeChainable();
    insertChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "new-purchase",
              user_id: "user-1",
              book_id: "book-1",
              amount_paid: 9.99,
              purchase_date: expect.any(String),
              created_at: expect.any(String),
              updated_at: expect.any(String),
            },
            error: null,
          }),
        ),
      })),
    }));
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await purchaseBook("user-1", "book-1", 9.99);
    expect(result.alreadyOwned).toBe(false);
    expect(result.purchase).toBeDefined();
    expect(result.purchase!.amount_paid).toBe(9.99);
    expect(mockFrom).toHaveBeenCalledWith("purchases");
  });

  it("returns alreadyOwned when user already purchased the book", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: {
        id: "existing",
        user_id: "user-1",
        book_id: "book-1",
        amount_paid: 9.99,
        purchase_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await purchaseBook("user-1", "book-1", 9.99);
    expect(result.alreadyOwned).toBe(true);
    expect(result.purchase).toBeDefined();
  });

  it("handles unique constraint violation (23505) gracefully", async () => {
    const checkChain = makeChainable();
    checkChain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValueOnce(checkChain);

    const insertChain = makeChainable();
    insertChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key", details: "", hint: "" },
          }),
        ),
      })),
    }));
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await purchaseBook("user-1", "book-1", 9.99);
    expect(result.alreadyOwned).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns error for other database errors", async () => {
    const checkChain = makeChainable();
    checkChain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValueOnce(checkChain);

    const insertChain = makeChainable();
    insertChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "23503", message: "foreign key violation", details: "", hint: "" },
          }),
        ),
      })),
    }));
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await purchaseBook("user-1", "book-1", 9.99);
    expect(result.alreadyOwned).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("defaults amountPaid to 0", async () => {
    const checkChain = makeChainable();
    checkChain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValueOnce(checkChain);

    const insertChain = makeChainable();
    insertChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "free",
              user_id: "user-1",
              book_id: "book-1",
              amount_paid: 0,
              purchase_date: expect.any(String),
              created_at: expect.any(String),
              updated_at: expect.any(String),
            },
            error: null,
          }),
        ),
      })),
    }));
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await purchaseBook("user-1", "book-1");
    expect(result.alreadyOwned).toBe(false);
    expect(result.purchase?.amount_paid).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════════════
   getBookPurchaseStats
   ════════════════════════════════════════════════════════════════════ */

describe("getBookPurchaseStats", () => {
  it("returns zero stats when no purchases exist", async () => {
    const countChain = makeChainable();
    countChain.__setResult({ count: 0 });
    const revenueChain = makeChainable();
    revenueChain.__setResult({ data: [], error: null });

    let callIdx = 0;
    mockFrom.mockImplementation(() => [countChain, revenueChain][callIdx++]);

    const result = await getBookPurchaseStats("book-1");
    expect(result.totalPurchases).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });

  it("returns correct purchase count and revenue", async () => {
    const countChain = makeChainable();
    countChain.__setResult({ count: 3 });
    const revenueChain = makeChainable();
    revenueChain.__setResult({
      data: [{ amount_paid: 9.99 }, { amount_paid: 14.99 }, { amount_paid: 0 }],
      error: null,
    });

    let callIdx = 0;
    mockFrom.mockImplementation(() => [countChain, revenueChain][callIdx++]);

    const result = await getBookPurchaseStats("book-1");
    expect(result.totalPurchases).toBe(3);
    expect(result.totalRevenue).toBeCloseTo(24.98);
  });
});
