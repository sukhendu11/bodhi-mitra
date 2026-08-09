import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setMockModeOverride } from "@/lib/data-source";

/* ─── Mock Supabase client ─────────────────────────────────────── */

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

/* ─── Import functions after mocks are set up ──────────────────── */

const { fetchPublishedBooks, fetchAllBooks, getBookStats } = await import("../books");

beforeEach(() => {
  vi.clearAllMocks();
});

/* ════════════════════════════════════════════════════════════════════
   fetchPublishedBooks (uses mock data layer)
   ════════════════════════════════════════════════════════════════════ */

describe("fetchPublishedBooks", () => {
  it("returns published books from mock data", async () => {
    const result = await fetchPublishedBooks();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    // All returned books should be published
    result.data.forEach((book) => {
      expect(book.status).toBe("published");
    });
  });

  it("respects page and pageSize", async () => {
    const result1 = await fetchPublishedBooks(1, 2);
    expect(result1.data.length).toBeLessThanOrEqual(2);

    const result2 = await fetchPublishedBooks(2, 2);
    // Different page should return different (or fewer) results
    expect(result2.data).toBeDefined();
  });

  it("filters by category", async () => {
    const result = await fetchPublishedBooks(1, 100, { category: "Meditation" });
    result.data.forEach((book) => {
      expect(book.category).toBe("Meditation");
    });
  });

  it("filters by featured", async () => {
    const result = await fetchPublishedBooks(1, 100, { featured: true });
    result.data.forEach((book) => {
      expect(book.featured).toBe(true);
    });
  });

  it("filters by search", async () => {
    const result = await fetchPublishedBooks(1, 100, { search: "Heart" });
    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((book) => {
      const matchesTitle = book.title_en?.toLowerCase().includes("heart");
      const matchesAuthor = book.author_name?.toLowerCase().includes("heart");
      expect(matchesTitle || matchesAuthor).toBe(true);
    });
  });

  it("returns mock data when called", async () => {
    // fetchPublishedBooks always uses mock data — no Strapi/Supabase involved
    const result = await fetchPublishedBooks();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════════
   fetchAllBooks (admin — real Supabase branch when NOT in mock mode)
   These tests mock the Supabase client, so force real mode via the seam.
   ════════════════════════════════════════════════════════════════════ */

describe("fetchAllBooks", () => {
  beforeEach(() => setMockModeOverride(false));
  afterEach(() => setMockModeOverride(null));
  function makeChainable() {
    const chain: Record<string, any> = {};
    let resolveValue: any = { data: null, error: null, count: 0 };
    let currentPromise: Promise<any> | null = null;

    const getPromise = () => {
      if (!currentPromise) currentPromise = Promise.resolve(resolveValue);
      return currentPromise;
    };

    chain.then = (onfulfilled: any, onrejected: any) => getPromise().then(onfulfilled, onrejected);
    chain.catch = (onrejected: any) => getPromise().catch(onrejected);
    chain.__setResult = (data: any) => { resolveValue = data; currentPromise = null; };

    const methods = ["select", "eq", "in", "or", "order", "range", "maybeSingle", "single", "delete"];
    for (const m of methods) chain[m] = vi.fn(() => chain);

    return chain;
  }

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

    await fetchAllBooks(1, 20, { category: "meditation" });
    expect(chain.eq).toHaveBeenCalledWith("category", "meditation");
  });
});

/* ════════════════════════════════════════════════════════════════════
   getBookStats
   ════════════════════════════════════════════════════════════════════ */

describe("getBookStats", () => {
  function makeChainable() {
    const chain: Record<string, any> = {};
    let resolveValue: any = { data: null, error: null, count: 0 };
    let currentPromise: Promise<any> | null = null;

    const getPromise = () => {
      if (!currentPromise) currentPromise = Promise.resolve(resolveValue);
      return currentPromise;
    };

    chain.then = (onfulfilled: any, onrejected: any) => getPromise().then(onfulfilled, onrejected);
    chain.catch = (onrejected: any) => getPromise().catch(onrejected);
    chain.__setResult = (data: any) => { resolveValue = data; currentPromise = null; };

    const methods = ["select", "eq", "in", "or", "order", "range", "maybeSingle", "single", "delete"];
    for (const m of methods) chain[m] = vi.fn(() => chain);

    return chain;
  }

  it("returns all stats with zero defaults", async () => {
    const chains = Array.from({ length: 7 }, () => makeChainable());
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
    const mockCounts = [10, 5, 3, 2, 4, 8];
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

    const chains = Array.from({ length: 7 }, () => makeChainable());
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
