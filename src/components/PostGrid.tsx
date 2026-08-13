import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts, type PostCategory } from "@/lib/posts";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";
import { useLang, toBanglaDigits } from "@/lib/i18n";
import { Reveal } from "./Reveal";

const PAGE_SIZE = 9;

export function PostGrid({
  category,
  categories,
  searchQuery,
  pageSize = PAGE_SIZE,
}: {
  category?: PostCategory;
  categories?: string[];
  searchQuery?: string;
  pageSize?: number;
}) {
  const { t, lang } = useLang();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [category, categories, searchQuery]);

  const effectiveCategory = categories && categories.length > 0 ? categories[0] : category;

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", effectiveCategory ?? "all", page, searchQuery ?? "", categories?.join(",") ?? ""],
    queryFn: () => fetchPosts(effectiveCategory, page, pageSize, searchQuery, categories),
    staleTime: 60_000,
  });

  const posts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <PostCardSkeleton key={i} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16" key={page}>
          {posts.map((post, i) => (
            // Scroll-triggered per-card slide-up (matches the books/videos
            // grids). `stagger-enter` was mount-time — cards below the fold
            // (single-column on small screens) had finished animating before
            // the user scrolled to them, so no transition was visible.
            <Reveal key={post.id} fade={false} delay={Math.min(i * 0.05, 0.3)}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="mt-16 flex items-center justify-center gap-6 text-sm"
          aria-label="Pagination"
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-border px-5 py-3 md:px-4 md:py-2 uppercase tracking-[0.15em] text-xs hover:bg-foreground hover:text-background disabled:opacity-50 disabled:pointer-events-none transition-colors min-h-[44px]"
          >
            ← {t("prev_page")}
          </button>
          <span className="text-muted-foreground text-xs">
            {lang === "bn" ? toBanglaDigits(page) : page} / {lang === "bn" ? toBanglaDigits(totalPages) : totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-border px-5 py-3 md:px-4 md:py-2 uppercase tracking-[0.15em] text-xs hover:bg-foreground hover:text-background disabled:opacity-50 disabled:pointer-events-none transition-colors min-h-[44px]"
          >
            {t("next_page")} →
          </button>
        </nav>
      )}
    </div>
  );
}
