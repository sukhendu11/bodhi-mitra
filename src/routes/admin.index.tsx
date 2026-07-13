import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  Eye,
  Edit3,
  LayoutDashboard,
  BookOpen,
  Globe,
  Users,
  Video,
  MessageSquare,
  ArrowRight,
  Clock,
  PenSquare,
  Upload,
  BarChart3,
  Plus,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import { DashboardSkeleton } from "@/components/admin/admin-skeleton";
import { SystemUpdates } from "@/components/admin/system-updates";
import { ErrorPage } from "@/components/error-page";
import {
  AnalyticsOverview,
  MonthlyPostChart,
  TopContent,
} from "@/components/admin/analytics-widgets";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminDashboard() {
  /* ── Consolidated Dashboard Stats (single server call) ───────── */

  const doGetStats = useServerFn(getDashboardStats);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => (doGetStats as any)(),
    staleTime: 30_000,
  });

  /* ── Loading state ──────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-1">Loading your dashboard...</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  const totalPosts = stats?.posts.total ?? 0;
  const published = stats?.posts.published ?? 0;
  const drafts = stats?.posts.draft ?? 0;
  const totalPagesCount = stats?.pages.total ?? 0;
  const totalBooksCount = stats?.books.total ?? 0;
  const totalUsersCount = stats?.users.total ?? 0;
  const totalComments = stats?.comments.total ?? 0;
  const totalPurchases = stats?.purchases.total ?? 0;
  const totalRatings = stats?.ratings.total ?? 0;
  const postsPerMonth = stats?.postsPerMonth ?? [];
  const topCommented = stats?.topCommented ?? [];
  const topRatedBooks = stats?.topRatedBooks ?? [];
  const recentPosts: Array<{
    id: string;
    title_en: string | null;
    title_bn: string | null;
    status: string;
    slug: string;
    created_at: string;
  }> = stats?.recentPosts ?? [];

  /* ── Quick actions ─────────────────────────────────────────────── */

  const quickActions = [
    {
      to: "/admin/posts",
      label: "All Posts",
      icon: PenSquare,
      color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    },
    {
      to: "/admin/pages",
      label: "Pages",
      icon: Globe,
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    {
      to: "/admin/books",
      label: "Add Book",
      icon: BookOpen,
      color: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    },
    {
      to: "/admin/media",
      label: "Upload Media",
      icon: Upload,
      color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    },
    {
      to: "/admin/videos",
      label: "Add Video",
      icon: Video,
      color: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    },
    {
      to: "/admin/comments",
      label: "Moderation",
      icon: MessageSquare,
      color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
    },
  ];

  /* ── Stats cards ───────────────────────────────────────────────── */

  const statsCards = [
    { icon: FileText, label: "Total Posts", value: totalPosts, color: "blue" as const },
    { icon: Eye, label: "Published", value: published, color: "green" as const },
    { icon: Edit3, label: "Drafts", value: drafts, color: "amber" as const },
    { icon: Globe, label: "Pages", value: totalPagesCount, color: "emerald" as const },
    { icon: BookOpen, label: "Books", value: totalBooksCount, color: "purple" as const },
    { icon: Users, label: "Users", value: totalUsersCount, color: "slate" as const },
  ];

  return (
    <div className="space-y-8">
      {/* ── Welcome header ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Welcome to your CMS dashboard. Here's an overview of your site.
        </p>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsCards.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            color={stat.color}
          />
        ))}
      </div>

      {/* ── Analytics Section ─────────────────────────────────────────── */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
          Analytics
        </h3>
        <AnalyticsOverview
          totalComments={totalComments}
          totalPurchases={totalPurchases}
          totalRatings={totalRatings}
        />
        {(postsPerMonth.length > 0 || topCommented.length > 0 || topRatedBooks.length > 0) && (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
            {postsPerMonth.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-5">
                <MonthlyPostChart data={postsPerMonth} />
              </div>
            )}
            {(topCommented.length > 0 || topRatedBooks.length > 0) && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-5">
                <TopContent commented={topCommented} books={topRatedBooks} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Actions + Recent Activity + System Updates ─────────── */}
      <div className="grid lg:grid-cols-[1fr_320px_280px] gap-6">
        {/* Quick actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground/60" />
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/30">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-center gap-2 px-4 py-6 bg-white dark:bg-zinc-900 hover:bg-secondary/20 transition-colors group"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-border/30 max-h-[320px] overflow-y-auto">
            {recentPosts.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Changes to posts, pages, and other content will appear here."
                compact
              />
            ) : (
              recentPosts.map((post: any) => (
                <div
                  key={post.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/10 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                    {post.status === "published" ? (
                      <Eye className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Edit3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{post.title_en || "Untitled"}</p>
                    <p className="text-[0.55rem] text-muted-foreground">
                      {post.status === "published" ? "Published" : "Saved as draft"}
                      {" · "}
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    to="/admin/posts"
                    className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System */}
        <SystemUpdates />
      </div>

      {/* ── Posts Management CTA ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-6 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-semibold mb-1">Posts Management</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {totalPosts} total posts · {published} published · {drafts} drafts
        </p>
        <Link
          to="/admin/posts"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Manage Posts
        </Link>
      </div>
    </div>
  );
}

export { getDashboardStats };
