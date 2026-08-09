import { describe, it, expect, vi, afterEach } from "vitest";

/* ─── Mock TanStack Start + server request access ───────────────── */

vi.mock("@tanstack/react-start", () => ({
  createMiddleware: ({ type }: { type: string }) => ({
    server: (fn: any) => ({ type, fn }),
  }),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({
    headers: new Map([["authorization", "Bearer some-jwt-token"]]),
  }),
}));

import { requireAuthOrMock } from "@/lib/mock-auth";
import { setMockModeOverride } from "@/lib/data-source";

type MockMiddleware = { type: string; fn: (args: any) => Promise<any> };
const middleware = requireAuthOrMock as unknown as MockMiddleware;

afterEach(() => {
  setMockModeOverride(null);
});

/**
 * Regression for the "Book not found" on Add to Cart bug:
 * with `VITE_DATA_SOURCE=mock` AND real Supabase env vars configured, a valid
 * browser session used to push `addToCart`/`getCart` through the REAL DB path
 * (where mock ids like book-1 and admin-created books don't exist). The
 * middleware must short-circuit to mock context in mock mode regardless of
 * configured env / valid token — mock ids always resolve against mock data.
 */
describe("requireAuthOrMock mock-first dispatch", () => {
  it("always returns the mock context in mock mode, even with a valid session token present", async () => {
    setMockModeOverride(true);

    const next = vi.fn(async (m: any) => m.context);
    const ctxObj = { server: requireAuthOrMock };
    const result = await middleware.fn({
      next,
      createContext: () => ctxObj,
      context: ctxObj,
    } as any);

    expect(result).toEqual({ supabase: null, userId: null, claims: null });
    expect(next).toHaveBeenCalledTimes(1);
    // token present would otherwise be validated — mock mode must skip it
  });

  it("short-circuits to mock in mock mode before reading Supabase env vars", async () => {
    setMockModeOverride(true);

    const next = vi.fn(async (m: any) => m.context);
    const ctxObj = { server: undefined };
    const result = await middleware.fn({
      next,
      createContext: () => ctxObj,
      context: ctxObj,
    } as any);

    expect(result).toEqual({ supabase: null, userId: null, claims: null });
  });
});