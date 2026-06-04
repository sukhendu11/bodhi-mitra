import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts, type PostCategory } from "@/lib/posts";
import { PostCard } from "./PostCard";
import { useLang } from "@/lib/i18n";

const PAGE_SIZE = 9;

export function PostGrid({ category, searchQuery, pageSize = PAGE_SIZE }: { category?: PostCategory; searchQuery?: string; pageSize?: number }) {
  const { t } = useLang();
  const [page, setPage] = useState(1);

  // Reset to page 1 when category or search changes
  useEffect(() => {
    setPage(1);
  }, [category, searchQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", category ?? "all", page, searchQuery ?? ""],
    queryFn: () => fetchPosts(category, page, pageSize, searchQuery),
    staleTime: 60_000,
  });

  const posts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isLoading) {
    return (
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/3] bg-secondary/60 mb-5" />
            <div className="h-3 w-24 bg-secondary mb-3" />
            <div className="h-5 w-3/4 bg-secondary" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{t("load_error")}</p>;
  }

  return (
    <div>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{t("no_posts")}</p>
      ) : (
        <div className="grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-16 flex items-center justify-center gap-6 text-sm" aria-label="Pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-border px-4 py-2 uppercase tracking-[0.15em] text-xs hover:bg-foreground hover:text-background disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            ← {t("prev_page")}
          </button>
          <span className="text-muted-foreground text-xs">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-border px-4 py-2 uppercase tracking-[0.15em] text-xs hover:bg-foreground hover:text-background disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            {t("next_page")} →
          </button>
        </nav>
      )}
    </div>
  );
}
