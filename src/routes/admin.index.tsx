import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createColumnHelper } from "@tanstack/react-table";
import { fetchAllPostsAdmin, deletePost, type Post, type PostStatus } from "@/lib/posts";
import { getDashboardStats } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText, Eye, Edit3, Trash2, Plus, LayoutDashboard, BookOpen, Globe, Users, Video, MessageSquare, ArrowRight, Clock, PenSquare, Upload, BarChart3,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { DataTable, StatusBadge, DateCell } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorPage } from "@/components/error-page";
import { AnalyticsOverview, MonthlyPostChart, TopContent } from "@/components/admin/analytics-widgets";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | PostStatus>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 20;

  /* ── Consolidated Dashboard Stats (single server call) ───────── */

  const doGetStats = useServerFn(getDashboardStats);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => (doGetStats as any)(),
    staleTime: 30_000,
  });

  /* ── Posts data (for the table below) ─────────────────────────── */

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["admin-posts", page],
    queryFn: () => fetchAllPostsAdmin(undefined, page, pageSize),
    staleTime: 30_000,
  });

  const posts = postsData?.data ?? [];
  const total = postsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
  const recentPosts: Array<{ id: string; title_en: string | null; title_bn: string | null; status: string; slug: string; created_at: string }> = stats?.recentPosts ?? [];

  const del = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = posts.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  const columnHelper = createColumnHelper<Post>();

  const postColumns = useMemo(
    () => [
      columnHelper.accessor("title_en", {
        header: "Post",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-start gap-3 min-w-0">
              {p.cover_image ? (
                <img src={p.cover_image} alt="" className="w-9 h-9 rounded-lg object-cover border border-border/40 shrink-0 mt-0.5" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
              <div className="min-w-0">
                <Link
                  to="/admin/$id"
                  params={{ id: p.id }}
                  className="text-sm font-medium hover:text-foreground/80 transition-colors line-clamp-1"
                >
                  {p.title_en || p.title || p.title_bn || <span className="italic text-muted-foreground">Untitled</span>}
                </Link>
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                  {p.category} · <DateCell date={p.created_at} />
                  {p.tags?.length ? ` · ${p.tags.slice(0, 2).join(", ")}` : ""}
                </p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("created_at", {
        header: "Date",
        enableSorting: true,
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              {p.status === "published" && (
                <Link
                  to="/posts/$slug"
                  params={{ slug: p.slug }}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              )}
              <Link
                to="/admin/$id"
                params={{ id: p.id }}
                className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setDeletingId(p.id)}
                className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  /* ── Quick actions ─────────────────────────────────────────────── */

  const quickActions = [
    { to: "/admin/new", label: "New Post", icon: PenSquare, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
    { to: "/admin/pages", label: "New Page", icon: Globe, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
    { to: "/admin/books", label: "Add Book", icon: BookOpen, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" },
    { to: "/admin/media", label: "Upload Media", icon: Upload, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
    { to: "/admin/videos", label: "Add Video", icon: Video, color: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" },
    { to: "/admin/comments", label: "Moderation", icon: MessageSquare, color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400" },
  ];

  /* ── Stats cards ───────────────────────────────────────────────── */

  const statsCards = [
    { icon: FileText, label: "Total Posts", value: total, color: "blue" as const },
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
          <StatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} />
        ))}
      </div>

      {/* ── Analytics Section ─────────────────────────────────────────── */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
          Analytics
        </h3>
        <AnalyticsOverview totalComments={totalComments} totalPurchases={totalPurchases} totalRatings={totalRatings} />
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

      {/* ── Quick Actions + Recent Activity ──────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
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
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-muted-foreground">No recent activity.</p>
              </div>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/10 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                    {post.status === "published" ? (
                      <Eye className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Edit3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {post.title_en || "Untitled"}
                    </p>
                    <p className="text-[0.55rem] text-muted-foreground">
                      {post.status === "published" ? "Published" : "Saved as draft"}
                      {" · "}
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Link
                    to="/admin/$id"
                    params={{ id: post.id }}
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

      {/* ── Posts Management ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground/60" />
            All Posts
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1">
              {(["all", "published", "draft"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === f
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f === "published" ? "Published" : "Drafts"}
                </button>
              ))}
            </div>
            <Link
              to="/admin/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3 w-3" />
              New Post
            </Link>
          </div>
        </div>

        <DataTable
          columns={postColumns}
          data={filtered}
          searchPlaceholder="Search posts…"
          pageSize={15}
        />
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deletingId) del.mutate(deletingId); }}
              disabled={del.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
