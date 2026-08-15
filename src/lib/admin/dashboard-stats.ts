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
import {
  mockFetchAllBooks,
  mockFetchAllPosts,
  mockFetchAllVideos,
  mockFetchCategories,
  mockFetchPages,
  mockFetchPublicNavItems,
  mockFetchTags,
} from "@/lib/mock-data";
import { mockGetAllOrders, mockGetAllPurchases } from "@/lib/mock-commerce";
import { mockFetchAllProfiles } from "@/lib/mock-session";
import { mockGetAllNotifications } from "@/lib/mock-notifications";

/** One bucket of the orders-by-status breakdown (finefoods-style analytics). */
export interface OrderStatusBucket {
  status: string;
  count: number;
}

/** A recent admin notification row (activity overview on the dashboard). */
export interface AdminActivityItem {
  id: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}

export interface AdminDashboardStats {
  /** Total content counts. */
  books: number;
  publishedBooks: number;
  posts: number;
  publishedPosts: number;
  videos: number;
  publishedVideos: number;
  /** Commerce counts. */
  orders: number;
  paidOrders: number;
  purchases: number;
  /** Sum of PAID order totals (BDT) — server-verified revenue only. */
  revenue: number;
  /** Orders bucketed by status — feeds the status chart. */
  ordersByStatus: OrderStatusBucket[];
  /** Unpaid orders awaiting fulfilment — needs-attention flag. */
  pendingOrders: number;
  /** Unpublished content rows across books/posts/videos — needs-attention flag. */
  draftContent: number;
  /** Row counts per admin resource — feeds the resource index. */
  resourceCounts: { resource: string; count: number }[];
  /** Latest admin notifications — feeds the activity overview. */
  recentActivity: AdminActivityItem[];
  /** Which backend produced the numbers ("mock" | "pending"). */
  source: "mock" | "pending";
}

export const EMPTY_DASHBOARD_STATS: AdminDashboardStats = {
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
  pendingOrders: 0,
  draftContent: 0,
  resourceCounts: [],
  recentActivity: [],
  source: "pending",
};

/** Bucket orders by status, ordered by frequency (most common first). */
export function bucketOrdersByStatus(
  orders: { status?: string | null }[],
): OrderStatusBucket[] {
  const counts = new Map<string, number>();
  for (const o of orders) {
    const status = o.status ?? "unknown";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

/** Pure derivation — no I/O, unit-testable. */
export function computeAdminDashboardStats(
  books: { status?: string | null }[],
  posts: { status?: string | null }[],
  videos: { status?: string | null }[],
  orders: { status?: string | null; total?: number }[],
  purchases: unknown[],
  activity: AdminActivityItem[] = [],
  resourceCounts: { resource: string; count: number }[] = [],
): AdminDashboardStats {
  const paidOrders = orders.filter((o) => o.status === "paid");
  const publishedBooks = books.filter((b) => b.status === "published").length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const publishedVideos = videos.filter((v) => v.status === "published").length;
  return {
    books: books.length,
    publishedBooks,
    posts: posts.length,
    publishedPosts,
    videos: videos.length,
    publishedVideos,
    orders: orders.length,
    paidOrders: paidOrders.length,
    purchases: purchases.length,
    revenue: paidOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
    ordersByStatus: bucketOrdersByStatus(orders),
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    draftContent:
      (books.length - publishedBooks) +
      (posts.length - publishedPosts) +
      (videos.length - publishedVideos),
    resourceCounts,
    recentActivity: activity,
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
  const [
    books,
    posts,
    videos,
    orders,
    purchases,
    notifications,
    pages,
    categories,
    navItems,
    profiles,
    tags,
  ] = await Promise.all([
    Promise.resolve(mockFetchAllBooks()),
    Promise.resolve(mockFetchAllPosts()),
    Promise.resolve(mockFetchAllVideos()),
    mockGetAllOrders(),
    mockGetAllPurchases(),
    mockGetAllNotifications(),
    Promise.resolve(mockFetchPages()),
    Promise.resolve(mockFetchCategories()),
    Promise.resolve(mockFetchPublicNavItems()),
    mockFetchAllProfiles(),
    Promise.resolve(mockFetchTags()),
  ]);
  const activity: AdminActivityItem[] = notifications
    .slice(0, 5)
    .map((n) => ({
      id: String(n.id),
      message: String(n.message ?? ""),
      type: String(n.type ?? ""),
      createdAt: String(n.createdAt ?? ""),
      read: Boolean(n.read),
    }));
  const resourceCounts = [
    { resource: "books", count: books.length },
    { resource: "posts", count: posts.length },
    { resource: "videos", count: videos.length },
    { resource: "pages", count: pages.length },
    { resource: "categories", count: categories.length },
    { resource: "navigation_items", count: navItems.length },
    { resource: "orders", count: orders.length },
    { resource: "profiles", count: profiles.length },
    { resource: "tags", count: tags.length },
    { resource: "notifications", count: notifications.length },
  ];
  return computeAdminDashboardStats(books, posts, videos, orders, purchases, activity, resourceCounts);
}
