import { useQuery } from "@tanstack/react-query";
import { fetchPosts, type PostCategory } from "@/lib/posts";
import { PostCard } from "./PostCard";
import { useLang } from "@/lib/i18n";

export function PostGrid({ category }: { category?: PostCategory }) {
  const { t } = useLang();
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts", category ?? "all"],
    queryFn: () => fetchPosts(category),
  });

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

  if (!posts || posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t("no_posts")}
      </p>
    );
  }

  return (
    <div className="grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
