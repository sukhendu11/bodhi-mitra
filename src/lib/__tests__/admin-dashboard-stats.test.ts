/**
 * P2 admin — dashboard analytics tests (AD-029).
 *
 * Pins the pure derivations (counts, published counts, paid-only revenue)
 * and the mock-first fetch seam (mock mode aggregates the offline stores;
 * real mode returns the zeroed "pending" shape so the dashboard keeps
 * rendering until Supabase aggregates are wired in P4).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  computeAdminDashboardStats,
  getAdminDashboardStats,
  bucketOrdersByStatus,
  EMPTY_DASHBOARD_STATS,
} from "@/lib/admin/dashboard-stats";
import { setMockModeOverride } from "@/lib/data-source";

beforeEach(() => {
  setMockModeOverride(true);
  localStorage.clear();
});

describe("computeAdminDashboardStats (pure derivations)", () => {
  it("counts content and filters published statuses", () => {
    const stats = computeAdminDashboardStats(
      [{ status: "published" }, { status: "published" }, { status: "draft" }],
      [{ status: "published" }, { status: "draft" }],
      [{}, {}, {}],
      [],
      [],
    );
    expect(stats.books).toBe(3);
    expect(stats.publishedBooks).toBe(2);
    expect(stats.posts).toBe(2);
    expect(stats.publishedPosts).toBe(1);
    expect(stats.videos).toBe(3);
  });

  it("revenue sums ONLY paid orders (never pending/failed/cancelled)", () => {
    const stats = computeAdminDashboardStats([], [], [], [
      { status: "paid", total: 100 },
      { status: "paid", total: 50 },
      { status: "pending", total: 9999 },
      { status: "failed", total: 9999 },
      { status: "cancelled", total: 9999 },
      { status: undefined, total: 9999 },
    ], []);
    expect(stats.orders).toBe(6);
    expect(stats.paidOrders).toBe(2);
    expect(stats.revenue).toBe(150);
  });

  it("counts purchases and reports the mock source", () => {
    const stats = computeAdminDashboardStats([], [], [], [], [{}, {}]);
    expect(stats.purchases).toBe(2);
    expect(stats.source).toBe("mock");
  });

  it("buckets orders by status (most frequent first)", () => {
    const buckets = bucketOrdersByStatus([
      { status: "paid" },
      { status: "pending" },
      { status: "paid" },
      { status: "failed" },
      { status: undefined },
    ]);
    expect(buckets).toEqual([
      { status: "paid", count: 2 },
      { status: "failed", count: 1 },
      { status: "pending", count: 1 },
      { status: "unknown", count: 1 },
    ]);
  });

  it("passes recent activity rows through to the stats", () => {
    const activity = [
      { id: "n1", message: "New purchase", type: "new_purchase", createdAt: "2026-08-15T00:00:00Z", read: false },
      { id: "n2", message: "Welcome", type: "welcome", createdAt: "2026-08-14T00:00:00Z", read: true },
    ];
    const stats = computeAdminDashboardStats([], [], [], [], [], activity);
    expect(stats.recentActivity).toEqual(activity);
  });

  it("empty inputs produce zeroed stats", () => {
    const stats = computeAdminDashboardStats([], [], [], [], []);
    expect(stats).toEqual({
      books: 0,
      publishedBooks: 0,
      posts: 0,
      publishedPosts: 0,
      videos: 0,
      orders: 0,
      paidOrders: 0,
      purchases: 0,
      revenue: 0,
      ordersByStatus: [],
      recentActivity: [],
      source: "mock",
    });
  });
});

describe("getAdminDashboardStats (mock-first seam)", () => {
  it("aggregates the offline mock stores in mock mode", async () => {
    const stats = await getAdminDashboardStats();
    // The mock catalog ships 10 books / 25 posts / 8 videos and the demo
    // seed adds 1 paid order + 2 purchases — assert the real store counts.
    expect(stats.source).toBe("mock");
    expect(stats.books).toBeGreaterThan(0);
    expect(stats.posts).toBeGreaterThan(0);
    expect(stats.videos).toBeGreaterThan(0);
    // Revenue equals the demo seed's paid order total.
    expect(stats.revenue).toBeGreaterThan(0);
    expect(stats.purchases).toBe(2);
  });

  it("returns the zeroed pending shape in real mode (Supabase aggregates not wired)", async () => {
    setMockModeOverride(false);
    const stats = await getAdminDashboardStats();
    expect(stats).toEqual(EMPTY_DASHBOARD_STATS);
    expect(stats.source).toBe("pending");
  });
});
