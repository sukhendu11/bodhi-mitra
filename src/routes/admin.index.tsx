import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuthSession, useIsAdmin } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
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
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Star,
  Activity,
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
  const { user } = useAuthSession();
  const { lang } = useLang();
  const config = useSiteSettings();

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

  /* ── Time-based greeting ────────────────────────────────────────── */

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? (lang === "bn" ? "সুপ্রভাত" : "Good morning") :
    hour < 18 ? (lang === "bn" ? "শুভ অপরাহ্ন" : "Good afternoon") :
    (lang === "bn" ? "শুভ সন্ধ্যা" : "Good evening");

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Admin";

  /* ── Quick actions ─────────────────────────────────────────────── */

  const quickActions = [
    {
      to: "/admin/posts",
      label: lang === "bn" ? "সকল পোস্ট" : "All Posts",
      icon: PenSquare,
      color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    },
    {
      to: "/admin/pages",
      label: lang === "bn" ? "পৃষ্ঠা" : "Pages",
      icon: Globe,
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    {
      to: "/admin/books",
      label: lang === "bn" ? "বই যোগ" : "Add Book",
      icon: BookOpen,
      color: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    },
    {
      to: "/admin/media",
      label: lang === "bn" ? "মিডিয়া" : "Upload Media",
      icon: Upload,
      color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    },
    {
      to: "/admin/videos",
      label: lang === "bn" ? "ভিডিও" : "Add Video",
      icon: Video,
      color: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    },
    {
      to: "/admin/comments",
      label: lang === "bn" ? "মডারেশন" : "Moderation",
      icon: MessageSquare,
      color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
    },
  ];

  /* ── Stats cards ───────────────────────────────────────────────── */

  const statsCards = [
    { icon: FileText, label: lang === "bn" ? "মোট পোস্ট" : "Total Posts", value: totalPosts, color: "blue" as const },
    { icon: Eye, label: lang === "bn" ? "প্রকাশিত" : "Published", value: published, color: "green" as const },
    { icon: Edit3, label: lang === "bn" ? "খসড়া" : "Drafts", value: drafts, color: "amber" as const },
    { icon: Globe, label: lang === "bn" ? "পৃষ্ঠা" : "Pages", value: totalPagesCount, color: "emerald" as const },
    { icon: BookOpen, label: lang === "bn" ? "বই" : "Books", value: totalBooksCount, color: "purple" as const },
    { icon: Users, label: lang === "bn" ? "ব্যবহারকারী" : "Users", value: totalUsersCount, color: "slate" as const },
  ];

  return (
    <div className="space-y-8">
      {/* ── Welcome header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {greeting}, {displayName}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "bn"
              ? "আপনার সাইটের একটি সারসংক্ষেপ এখানে।"
              : "Here's an overview of your site."}
          </p>
        </div>
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {lang === "bn" ? "সাইট দেখুন" : "View Site"} <ArrowRight className="h-3 w-3" />
        </Link>
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

      {/* ── Quick Actions + Recent Activity ────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Quick actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground/60" />
              {lang === "bn" ? "দ্রুত কাজ" : "Quick Actions"}
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
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              {lang === "bn" ? "সাম্প্রতিক কার্যক্রম" : "Recent Activity"}
            </h3>
            {recentPosts.length > 0 && (
              <Link
                to="/admin/posts"
                className="text-[0.55rem] text-muted-foreground hover:text-foreground transition-colors"
              >
                {lang === "bn" ? "সব দেখুন" : "View all"} →
              </Link>
            )}
          </div>
          <div className="divide-y divide-border/30 max-h-[320px] overflow-y-auto">
            {recentPosts.length === 0 ? (
              <EmptyState
                title={lang === "bn" ? "এখনো কোনো কার্যক্রম নেই" : "No activity yet"}
                description={lang === "bn"
                  ? "পোস্ট, পৃষ্ঠা এবং অন্যান্য বিষয়বস্তুর পরিবর্তনগুলি এখানে প্রদর্শিত হবে।"
                  : "Changes to posts, pages, and other content will appear here."}
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
                      {post.status === "published"
                        ? (lang === "bn" ? "প্রকাশিত" : "Published")
                        : (lang === "bn" ? "খসড়া হিসাবে সংরক্ষিত" : "Saved as draft")}
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
      </div>

      {/* ── Analytics Section ─────────────────────────────────────────── */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
          {lang === "bn" ? "বিশ্লেষণ" : "Analytics"}
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

      {/* ── System Updates ──────────────────────────────────────────── */}
      <SystemUpdates />
    </div>
  );
}

export { getDashboardStats };
