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
  bucketRevenueByDay,
  EMPTY_DASHBOARD_STATS,
} from "@/lib/admin/dashboard-stats";
import { setMockModeOverride } from "@/lib/data-source";

/** Local yyyy-mm-dd key for a Date (mirrors the derivation's local-day bucketing). */
function localDayKeyISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

  it("buckets paid revenue by local day over a zero-filled trailing window", () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const points = bucketRevenueByDay(
      [
        { status: "paid", total: 100, createdAt: twoDaysAgo.toISOString() },
        { status: "paid", total: 50, createdAt: twoDaysAgo.toISOString() },
        { status: "paid", total: 75, createdAt: sixDaysAgo.toISOString() },
        { status: "pending", total: 9999, createdAt: today.toISOString() },
        { status: "failed", total: 9999, createdAt: today.toISOString() },
      ],
      14,
    );
    expect(points).toHaveLength(14);
    expect(points[13].revenue).toBe(0); // today: only non-paid orders
    const twoAgo = points.find((p) => p.date === localDayKeyISO(twoDaysAgo));
    const sixAgo = points.find((p) => p.date === localDayKeyISO(sixDaysAgo));
    expect(twoAgo?.revenue).toBe(150);
    expect(sixAgo?.revenue).toBe(75);
  });

  it("sums revenue from the derive helper into the full stats", () => {
    const stats = computeAdminDashboardStats([], [], [], [
      { status: "paid", total: 100, createdAt: new Date().toISOString() },
    ], []);
    expect(stats.revenueByDay).toHaveLength(14);
    expect(stats.revenueByDay[13].revenue).toBe(100);
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
      publishedVideos: 0,
      orders: 0,
      paidOrders: 0,
      purchases: 0,
      revenue: 0,
      ordersByStatus: [],
      revenueByDay: expect.any(Array),
      pendingOrders: 0,
      draftContent: 0,
      resourceCounts: [],
      recentActivity: [],
      source: "mock",
    });
  });

  it("derives pending orders and draft content flags", () => {
    const stats = computeAdminDashboardStats(
      [{ status: "published" }, { status: "draft" }],
      [{ status: "draft" }],
      [{ status: "published" }],
      [{ status: "paid" }, { status: "pending" }],
      [],
    );
    expect(stats.pendingOrders).toBe(1);
    expect(stats.draftContent).toBe(2); // 1 draft book + 1 draft post
  });

  it("threads resource counts through", () => {
    const stats = computeAdminDashboardStats([], [], [], [], [], [], [
      { resource: "books", count: 10 },
      { resource: "orders", count: 1 },
    ]);
    expect(stats.resourceCounts).toEqual([
      { resource: "books", count: 10 },
      { resource: "orders", count: 1 },
    ]);
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
    // Seed v2: 6 paid orders (1–2 books each) → 9 purchases for the demo user.
    expect(stats.purchases).toBe(9);
    // Revenue-by-day is a zero-filled 14-day window ending today.
    expect(stats.revenueByDay).toHaveLength(14);
    expect(stats.revenueByDay[13].revenue).toBeGreaterThan(0);
    expect(stats.revenueByDay.some((p) => p.revenue > 0)).toBe(true);
  });

  it("returns the zeroed pending shape in real mode (Supabase aggregates not wired)", async () => {
    setMockModeOverride(false);
    const stats = await getAdminDashboardStats();
    expect(stats).toEqual(EMPTY_DASHBOARD_STATS);
    expect(stats.source).toBe("pending");
  });
});
