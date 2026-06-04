import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { fetchAllPostsAdmin, deletePost, type PostStatus } from "@/lib/posts";

export const Route = createFileRoute("/admin/")({
  component: AdminPostList,
});

type Filter = "all" | PostStatus;

function AdminPostList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: fetchAllPostsAdmin,
  });

  const del = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading posts…</p>;

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  const tabCls = (active: boolean) =>
    `pb-2 border-b-2 text-sm transition-colors ${
      active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl">Manage posts</h2>
        <Link to="/admin/new" className="px-4 py-2 text-xs uppercase tracking-wider bg-foreground text-background hover:opacity-90">
          + New post
        </Link>
      </div>

      <div className="flex gap-6 border-b border-border mb-6">
        <button onClick={() => setFilter("all")} className={tabCls(filter === "all")}>
          All ({posts.length})
        </button>
        <button onClick={() => setFilter("published")} className={tabCls(filter === "published")}>
          Published ({publishedCount})
        </button>
        <button onClick={() => setFilter("draft")} className={tabCls(filter === "draft")}>
          Drafts ({draftCount})
        </button>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {filtered.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-4 gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                    p.status === "published"
                      ? "border-foreground/40 text-foreground"
                      : "border-muted-foreground/40 text-muted-foreground bg-secondary"
                  }`}
                >
                  {p.status}
                </span>
                <Link
                  to="/admin/$id"
                  params={{ id: p.id }}
                  className="font-serif text-lg truncate hover:underline"
                >
                  {p.title_en || p.title || p.title_bn || <span className="italic text-muted-foreground">Untitled</span>}
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {p.category} · {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {p.status === "published" && (
                <Link to="/posts/$slug" params={{ slug: p.slug }} className="text-muted-foreground hover:text-foreground">
                  View
                </Link>
              )}
              <Link to="/admin/$id" params={{ id: p.id }} className="text-muted-foreground hover:text-foreground">
                {p.status === "draft" ? "Continue editing" : "Edit"}
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${p.title_en || p.title || p.title_bn || "post"}"?`)) del.mutate(p.id);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-12 text-center text-sm text-muted-foreground">
            No {filter === "all" ? "" : filter} posts yet.
          </li>
        )}
      </ul>
    </div>
  );
}
