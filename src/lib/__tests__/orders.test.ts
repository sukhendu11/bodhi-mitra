import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mock TanStack Start (server functions need runtime context) ─── */

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder: any = (args: any) => builder._handler(args);
    builder.method = () => builder;
    builder.middleware = () => builder;
    builder.handler = (handlerFn: any) => {
      builder._handler = handlerFn;
      return builder;
    };
    builder.validator = () => builder;
    return builder;
  },
  createMiddleware: () => ({
    server: (fn: any) => fn,
  }),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({
    headers: new Map([["authorization", "Bearer test-token"]]),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/mock-commerce", async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, any>;
  return {
    ...mod,
    mockGetOrders: vi.fn(),
  };
});

vi.mock("@/lib/data-source", () => ({
  isMockMode: () => true,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

const { mockGetOrders } = await import("@/lib/mock-commerce");
const { getOrders } = (await import("@/lib/orders")) as any;

describe("getOrders (mock-first)", () => {
  it("maps mock orders to receipt shape with subtotal/discount/tax/total", async () => {
    (mockGetOrders as any).mockResolvedValue([
      {
        id: "order-1",
        userId: "user-1",
        items: [
          { bookId: "book-2", titleEn: "A", titleBn: "ক", price: 100 },
          { bookId: "book-4", titleEn: "B", titleBn: null, price: 50 },
        ],
        discount: 10,
        tax: 7,
        total: 147,
        status: "paid",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    const result = await getOrders({ context: { userId: "user-1", supabase: null }, data: {} });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("order-1");
    expect(result[0].subtotal).toBeCloseTo(150);
    expect(result[0].discount).toBe(10);
    expect(result[0].tax).toBe(7);
    expect(result[0].total).toBe(147);
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].titleEn).toBe("A");
    expect(result[0].items[0].titleBn).toBe("ক");
  });

  it("returns empty array without a userId", async () => {
    const result = await getOrders({ context: { userId: null, supabase: null }, data: {} });
    expect(result).toEqual([]);
    expect(mockGetOrders).not.toHaveBeenCalled();
  });
});
