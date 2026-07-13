import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mock Supabase client ─────────────────────────────────────── */

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

/* ─── Helper: build thenable chain mock ───────────────────────────
 *
 * All chain methods return the chain itself.
 * The chain is thenable (has .then/.catch) and resolves when `await`-ed.
 * Tests call `chain.__setResult(data)` to control what the chain resolves to.
 */

function makeChainable() {
  const chain: Record<string, any> = {};
  let resolveValue: any = { data: null, error: null, count: 0 };
  let currentPromise: Promise<any> | null = null;

  const getPromise = () => {
    if (!currentPromise) currentPromise = Promise.resolve(resolveValue);
    return currentPromise;
  };

  // Make chain thenable — resolves to the current resolveValue on await
  chain.then = (onfulfilled: any, onrejected: any) => getPromise().then(onfulfilled, onrejected);
  chain.catch = (onrejected: any) => getPromise().catch(onrejected);

  // Allow tests to set the resolve value
  chain.__setResult = (data: any) => {
    resolveValue = data;
    currentPromise = null;
  };

  // All chainable methods return the chain
  const methods = ["select", "eq", "in", "or", "order", "range", "maybeSingle", "single", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─── Import functions after mocks are set up ──────────────────── */

const { fetchPublishedBooks, fetchAllBooks, getBookStats } = await import("../books");

/* ════════════════════════════════════════════════════════════════════
   fetchPublishedBooks
   ════════════════════════════════════════════════════════════════════ */

describe("fetchPublishedBooks", () => {
  const mockBooks = [
    { id: "1", title_en: "Book One", category: "wisdom", status: "published" },
    { id: "2", title_en: "Book Two", category: "meditation", status: "published" },
  ];

  it("fetches published books with default pagination", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: mockBooks, error: null, count: 2 });
    mockFrom.mockReturnValue(chain);

    const result = await fetchPublishedBooks();
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockFrom).toHaveBeenCalledWith("books");
    expect(chain.eq).toHaveBeenCalledWith("status", "published");
    expect(chain.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(chain.range).toHaveBeenCalledWith(0, 11);
  });

  it("accepts custom page and pageSize", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    await fetchPublishedBooks(3, 5);
    expect(chain.range).toHaveBeenCalledWith(10, 14);
  });

  it("filters by category when category option is provided", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: mockBooks, error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    await fetchPublishedBooks(1, 12, { category: "wisdom" });
    // After range(), the code chains .eq("category", "wisdom")
    expect(chain.eq).toHaveBeenCalledWith("category", "wisdom");
  });

  it("filters by featured when featured option is true", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    await fetchPublishedBooks(1, 12, { featured: true });
    expect(chain.eq).toHaveBeenCalledWith("featured", true);
  });

  it("filters by search query using ilike", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [mockBooks[0]], error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    const result = await fetchPublishedBooks(1, 12, { search: "Book One" });
    expect(result.data).toHaveLength(1);
    expect(chain.or).toHaveBeenCalled();
    const orCall = (chain.or as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orCall).toContain("Book One");
  });

  it("sanitizes search input by removing SQL wildcards", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    await fetchPublishedBooks(1, 12, { search: "%_malicious%" });
    const orCall = (chain.or as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // The search term (after stripping % and _) should be "malicious"
    // _ and % are PostgreSQL wildcards, so they should be removed from user input
    expect(orCall).toContain("malicious");
    expect(orCall).not.toContain("%");
    // _ appears in "ilike" syntax itself, so we check the term is cleanly interpolated
  });

  it("skips search when search is empty or whitespace", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: mockBooks, error: null, count: 2 });
    mockFrom.mockReturnValue(chain);

    await fetchPublishedBooks(1, 12, { search: "   " });
    expect(chain.or).not.toHaveBeenCalled();
  });

  it("throws when database error occurs", async () => {
    const chain = makeChainable();
    // Override then to reject
    chain.then = (_: any, onrejected: any) =>
      Promise.reject(new Error("DB error")).catch(onrejected);
    mockFrom.mockReturnValue(chain);

    await expect(fetchPublishedBooks()).rejects.toThrow("DB error");
  });
});

/* ════════════════════════════════════════════════════════════════════
   fetchAllBooks
   ════════════════════════════════════════════════════════════════════ */

describe("fetchAllBooks", () => {
  const mockBooks = [
    { id: "1", title_en: "Draft Book", status: "draft" },
    { id: "2", title_en: "Published Book", status: "published" },
    { id: "3", title_en: "Archived Book", status: "archived" },
  ];

  it("fetches all books with default pagination", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: mockBooks, error: null, count: 3 });
    mockFrom.mockReturnValue(chain);

    const result = await fetchAllBooks();
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("filters by status when option is provided", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [mockBooks[0]], error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    const result = await fetchAllBooks(1, 20, { status: "draft" });
    expect(result.data).toHaveLength(1);
    expect(chain.eq).toHaveBeenCalledWith("status", "draft");
  });

  it("filters by category when option is provided", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    await fetchAllBooks(1, 20, { category: "buddhist-psychology" });
    expect(chain.eq).toHaveBeenCalledWith("category", "buddhist-psychology");
  });

  it("filters by search in title and author", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: [mockBooks[0]], error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    await fetchAllBooks(1, 20, { search: "Draft" });
    expect(chain.or).toHaveBeenCalled();
    const orCall = (chain.or as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orCall).toContain("Draft");
    expect(orCall).toContain("author_name");
  });
});

/* ════════════════════════════════════════════════════════════════════
   getBookStats
   ════════════════════════════════════════════════════════════════════ */

describe("getBookStats", () => {
  it("returns all stats with zero defaults", async () => {
    const chains = Array.from({ length: 7 }, () => makeChainable());
    // First 5 for books, 6th for purchases count, 7th for revenue
    chains[0].__setResult({ count: 0 });
    chains[1].__setResult({ count: 0 });
    chains[2].__setResult({ count: 0 });
    chains[3].__setResult({ count: 0 });
    chains[4].__setResult({ count: 0 });
    chains[5].__setResult({ count: 0 });
    chains[6].__setResult({ data: [], error: null });

    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    const result = await getBookStats();
    expect(result.total).toBe(0);
    expect(result.published).toBe(0);
    expect(result.draft).toBe(0);
    expect(result.archived).toBe(0);
    expect(result.free).toBe(0);
    expect(result.totalPurchases).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });

  it("correctly aggregates book stats", async () => {
    const mockCounts = [10, 5, 3, 2, 4, 8]; // total, published, draft, archived, free, purchases
    const revenueData = [
      { amount_paid: 9.99 },
      { amount_paid: 14.99 },
      { amount_paid: 5.0 },
      { amount_paid: 19.99 },
      { amount_paid: 0 },
      { amount_paid: 7.5 },
      { amount_paid: 12.0 },
      { amount_paid: 3.99 },
    ];

    const chains = [
      makeChainable(),
      makeChainable(),
      makeChainable(),
      makeChainable(),
      makeChainable(),
      makeChainable(),
      makeChainable(),
    ];
    for (let i = 0; i < 6; i++) chains[i].__setResult({ count: mockCounts[i] });
    chains[6].__setResult({ data: revenueData, error: null });

    let callIdx = 0;
    mockFrom.mockImplementation(() => chains[callIdx++]);

    const result = await getBookStats();
    expect(result.total).toBe(10);
    expect(result.published).toBe(5);
    expect(result.draft).toBe(3);
    expect(result.archived).toBe(2);
    expect(result.free).toBe(4);
    expect(result.totalPurchases).toBe(8);
    expect(result.totalRevenue).toBeCloseTo(73.46);
  });
});
