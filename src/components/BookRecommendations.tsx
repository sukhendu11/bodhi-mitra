import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getSemanticRecommendations } from "@/lib/ai/recommendations";
import { useLang, pickLocalized } from "@/lib/i18n";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */

interface BookRecommendationsProps {
  contentType: string;
  contentId: string;
  title?: string;
  limit?: number;
}

/* ─── Component ────────────────────────────────────────────────── */

export function BookRecommendations({
  contentType,
  contentId,
  title = "You Might Also Like",
  limit = 6,
}: BookRecommendationsProps) {
  const { lang } = useLang();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["recommendations", contentType, contentId, limit],
    queryFn: () => getSemanticRecommendations(contentType, contentId, limit),
    enabled: !!contentId,
    staleTime: 300_000, // 5 min cache
  });

  if (isLoading) {
    return (
      <section className="mt-16">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="h-4 w-4 text-saffron" />
          <h2 className="font-serif text-2xl">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              <div className="mt-2 h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="mt-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-saffron" />
          <h2 className="font-serif text-2xl">{title}</h2>
        </div>
        <Link
          to="/books"
          search={{ search: "", page: 1 }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Browse all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {recommendations.slice(0, limit).map((rec, i) => {
          const to =
            rec.contentType === "book"
              ? `/books/${rec.slug}`
              : rec.contentType === "post"
                ? `/posts/${rec.slug}`
                : rec.contentType === "course"
                  ? `/courses/${rec.slug}`
                  : "#";

          return (
            <Link
              key={`${rec.contentType}:${rec.contentId}`}
              to={to as any}
              search={rec.contentType === "book" ? { search: "", page: 1 } : undefined as any}
              className="group block"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-lg overflow-hidden border border-border/50 group-hover:border-foreground/30 group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-300 relative">
                {rec.imageUrl ? (
                  <img
                    src={rec.imageUrl}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                )}

                {/* Match reason badge */}
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="block text-[0.4rem] font-medium uppercase tracking-wider text-white/80 bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 truncate">
                    {rec.matchReason}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs font-medium font-serif line-clamp-1 group-hover:text-saffron transition-colors">
                {rec.title}
              </p>
              {rec.excerpt && (
                <p className="mt-0.5 text-[0.55rem] text-muted-foreground line-clamp-2">
                  {rec.excerpt}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
