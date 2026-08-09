/**
 * Mock-aware auth middleware for server functions.
 *
 * Same validation flow as `requireSupabaseAuth`, but instead of throwing when
 * Supabase is unavailable (missing env vars, no Bearer token, invalid token),
 * it passes a `{ supabase: null, userId: null }` context so handlers can fall
 * back to the localStorage-backed mock implementations (mock-cart.ts etc.).
 *
 * This is the mock-first dev seam: cart / coupon / reader flows keep working
 * offline with structured mock data; once real Supabase is connected the same
 * code path validates real JWTs and uses the real database.
 */

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { isMockMode } from "@/lib/data-source";

export const requireAuthOrMock = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockContext: any = { supabase: null, userId: null, claims: null };

    // Mock-first dispatch: even when real Supabase env vars are configured,
    // `VITE_DATA_SOURCE=mock` must NEVER route through the real DB. Without
    // this, a valid browser session + configured env sends addToCart/getCart
    // etc. down the real path, where mock ids (book-1, admin-created books)
    // don't exist → "Book not found." for every mock book.
    if (isMockMode()) {
      return next({ context: mockContext });
    }

    // Supabase not configured → mock mode
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return next({ context: mockContext });
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    // Guest / no token → mock mode (localStorage cart works for guests in dev)
    if (!token) {
      return next({ context: mockContext });
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        // Token validation failed while Supabase is reachable — real auth error,
        // NOT a mock-mode signal. Do not silently degrade in production.
        throw new Error("Unauthorized: Invalid token");
      }

      return next({
        context: {
          supabase,
          userId: data.claims.sub,
          claims: data.claims,
        },
      });
    } catch (err) {
      // Supabase unreachable (network) → mock mode. Auth failures still throw.
      if (err instanceof Error && err.message === "Unauthorized: Invalid token") {
        throw err;
      }
      return next({ context: mockContext });
    }
  },
);
