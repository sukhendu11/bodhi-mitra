import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { fetchAllPostsAdmin, deletePost, type PostStatus } from "@/lib/posts";
import { FileText, Eye, Edit3, Trash2, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | PostStatus>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-posts", page],
    queryFn: () => fetchAllPostsAdmin(undefined, page, pageSize),
    staleTime: 30_000,
  });

  const posts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;

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
    if (search) {
      const q = search.toLowerCase();
      const title = (p.title_en || p.title || p.title_bn || "").toLowerCase();
      if (!title.includes(q)) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-6 space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-secondary/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Total Posts" value={total} color="blue" />
        <StatCard icon={Eye} label="Published" value={published} color="green" />
        <StatCard icon={Edit3} label="Drafts" value={drafts} color="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              className="w-full sm:w-48 pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            New Post
          </Link>
        </div>
      </div>

      {/* Posts table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No posts match your search." : filter === "all" ? "No posts yet." : `No ${filter} posts.`}
            </p>
            {!search && (
              <Link to="/admin/new" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-foreground hover:underline">
                <Plus className="h-3 w-3" /> Create your first post
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr,auto,auto] gap-4 px-5 py-3 bg-secondary/20 text-[0.6rem] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
              <span>Post</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-28 text-right">Actions</span>
            </div>

            {filtered.map((p) => (
              <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto] gap-3 sm:gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    {p.cover_image ? (
                      <img src={p.cover_image} alt="" className="hidden sm:block w-10 h-10 rounded-lg object-cover border border-border/40 shrink-0 mt-0.5" />
                    ) : (
                      <div className="hidden sm:flex w-10 h-10 rounded-lg bg-secondary/60 border border-border/40 items-center justify-center shrink-0 mt-0.5">
                        <FileText className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                    <div>
                      <Link
                        to="/admin/$id"
                        params={{ id: p.id }}
                        className="text-sm font-medium hover:text-foreground/80 transition-colors line-clamp-1"
                      >
                        {p.title_en || p.title || p.title_bn || <span className="italic text-muted-foreground">Untitled</span>}
                      </Link>
                      <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                        {p.category} · {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {p.tags?.length ? ` · ${p.tags.slice(0, 2).join(", ")}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <span
                    className={`text-[0.6rem] font-medium uppercase tracking-[0.08em] px-2.5 py-0.5 rounded-full border ${
                      p.status === "published"
                        ? "border-green-300/50 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/50"
                        : "border-amber-300/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1">
                  {p.status === "published" && (
                    <Link
                      to="/posts/$slug"
                      params={{ slug: p.slug }}
                      className="p-2 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <Link
                    to="/admin/$id"
                    params={{ id: p.id }}
                    className="p-2 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.title_en || p.title || p.title_bn || "post"}"?`)) del.mutate(p.id);
                    }}
                    className="p-2 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({total} total posts)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat card component ──────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: "blue" | "green" | "amber" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  };
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 px-5 py-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
