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
  // permissions.ts uses createMiddleware({...}).middleware([...]).server(...)
  createMiddleware: () => ({
    middleware: () => ({
      server: () => ({ handler: () => {} }),
    }),
    server: () => ({}),
  }),
}));

vi.mock("@/lib/data-source", () => ({
  isMockMode: () => true,
  setMockModeOverride: () => {},
}));

/* ─── Supabase client — would be reached in non-mock mode only ── */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      throw new Error("should not be called in mock mode");
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
});

const { searchContent } = (await import("../search")) as any;

describe("searchContent mock path (E4.3)", () => {
  it("searches posts across title and excerpt", async () => {
    const res = await searchContent({ data: { q: "meditation", type: "post" } });
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.every((r: any) => r.type === "post")).toBe(true);
  });

  it("returns results across all types by default", async () => {
    const res = await searchContent({ data: { q: "mind" } });
    const types = new Set(res.results.map((r: any) => r.type));
    expect(types.size).toBeGreaterThan(1);
  });

  it("searches pages when the pages type filter is used", async () => {
    const res = await searchContent({ data: { q: "wisdom", type: "page" } });
    expect(res.total).toBeGreaterThan(0);
    expect(res.results[0].type).toBe("page");
    expect(res.results[0].url.startsWith("/pages/")).toBe(true);
  });

  it("searches books with the book type filter", async () => {
    const res = await searchContent({ data: { q: "buddhist", type: "book" } });
    expect(res.results.every((r: any) => r.type === "book")).toBe(true);
  });

  it("searches videos with the video type filter", async () => {
    const res = await searchContent({ data: { q: "meditation", type: "video" } });
    expect(res.results.every((r: any) => r.type === "video")).toBe(true);
  });

  it("returns empty results for a nonsense query", async () => {
    const res = await searchContent({ data: { q: "zzzzzzznonsenseqqq" } });
    expect(res.total).toBe(0);
    expect(res.results).toHaveLength(0);
  });

  it("returns empty results for an empty query", async () => {
    const res = await searchContent({ data: { q: "" } });
    expect(res.total).toBe(0);
  });

  it("highlights the search term with mark tags", async () => {
    const res = await searchContent({ data: { q: "breath", type: "post" } });
    const withHl = res.results.find((r: any) => r.highlightedTitle?.includes("<mark>"));
    expect(withHl).toBeTruthy();
  });

  it("sorts by date when requested", async () => {
    const res = await searchContent({ data: { q: "the", sort: "date" } });
    if (res.total > 1) {
      const dates = res.results.map((r: any) => new Date(r.created_at).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    }
  });

  it("paginates with a page size of 20", async () => {
    const res = await searchContent({ data: { q: "the", page: 1 } });
    expect(res.results.length).toBeLessThanOrEqual(20);
  });
});
