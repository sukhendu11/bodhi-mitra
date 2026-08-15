/**
 * Admin dashboard analytics — P2 (AD-029).
 *
 * Pure derivations from the same lists the admin resources use (books,
 * posts, videos, orders, purchases), plus a mock-first fetch seam:
 *   mock mode → aggregates from the offline mock stores
 *   real mode → zeroed until the Supabase aggregate queries are wired
 *               (P4, blocked on the fresh instance; the seam keeps the
 *               dashboard rendering in both modes)
 */
import { isMockMode } from "@/lib/data-source";
import { mockFetchAllBooks, mockFetchAllPosts, mockFetchAllVideos } from "@/lib/mock-data";
import { mockGetAllOrders, mockGetAllPurchases } from "@/lib/mock-commerce";

export interface AdminDashboardStats {
  /** Total content counts. */
  books: number;
  publishedBooks: number;
  posts: number;
  publishedPosts: number;
  videos: number;
  /** Commerce counts. */
  orders: number;
  paidOrders: number;
  purchases: number;
  /** Sum of PAID order totals (BDT) — server-verified revenue only. */
  revenue: number;
  /** Which backend produced the numbers ("mock" | "pending"). */
  source: "mock" | "pending";
}

export const EMPTY_DASHBOARD_STATS: AdminDashboardStats = {
  books: 0,
  publishedBooks: 0,
  posts: 0,
  publishedPosts: 0,
  videos: 0,
  orders: 0,
  paidOrders: 0,
  purchases: 0,
  revenue: 0,
  source: "pending",
};

/** Pure derivation — no I/O, unit-testable. */
export function computeAdminDashboardStats(
  books: { status?: string | null }[],
  posts: { status?: string | null }[],
  videos: unknown[],
  orders: { status?: string | null; total?: number }[],
  purchases: unknown[],
): AdminDashboardStats {
  const paidOrders = orders.filter((o) => o.status === "paid");
  return {
    books: books.length,
    publishedBooks: books.filter((b) => b.status === "published").length,
    posts: posts.length,
    publishedPosts: posts.filter((p) => p.status === "published").length,
    videos: videos.length,
    orders: orders.length,
    paidOrders: paidOrders.length,
    purchases: purchases.length,
    revenue: paidOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
    source: "mock",
  };
}

/**
 * Mock-first fetch seam. Real mode returns the zeroed shape (rendered as
 * "—") until the Supabase aggregate queries are wired in P4 — the dashboard
 * keeps rendering in both modes, matching the dataProvider seam pattern.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (!isMockMode()) return EMPTY_DASHBOARD_STATS;
  const [books, posts, videos, orders, purchases] = await Promise.all([
    Promise.resolve(mockFetchAllBooks()),
    Promise.resolve(mockFetchAllPosts()),
    Promise.resolve(mockFetchAllVideos()),
    mockGetAllOrders(),
    mockGetAllPurchases(),
  ]);
  return computeAdminDashboardStats(books, posts, videos, orders, purchases);
}
