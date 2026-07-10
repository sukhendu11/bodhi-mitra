import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { searchContent, type SearchResult, type ContentType } from "@/lib/search";
import { Search, FileText, BookOpen, Video, File, Loader2, ArrowLeft } from "lucide-react";

const contentTypes: { key: ContentType | "all"; label: string; icon: typeof Search }[] = [
  { key: "all", label: "All", icon: Search },
  { key: "post", label: "Reflections", icon: FileText },
  { key: "page", label: "Pages", icon: File },
  { key: "book", label: "Books", icon: BookOpen },
  { key: "video", label: "Videos", icon: Video },
];

const typeIcons: Record<string, typeof FileText> = {
  post: FileText,
  page: File,
  book: BookOpen,
  video: Video,
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    type: (search.type as ContentType | undefined) ?? undefined,
    page: (search.page as number) ?? 1,
  }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const { q, type, page } = Route.useSearch();
  const [inputValue, setInputValue] = useState(q);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const searchFn = useServerFn(searchContent);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, type, page],
    queryFn: () => (searchFn as any)({ data: { q, type, page } }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  function doSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    navigate({ to: "/search", search: { q: trimmed, type: undefined, page: 1 }, replace: true });
  }

  function setTypeFilter(t: ContentType | "all") {
    navigate({ to: "/search", search: { q, type: t === "all" ? undefined : t, page: 1 }, replace: true });
  }

  function goToPage(p: number) {
    navigate({ to: "/search", search: { q, type, page: p }, replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
      {/* Search input */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight mb-6">
          Search
        </h1>
        <form
          onSubmit={(e) => { e.preventDefault(); doSearch(inputValue); }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search reflections, books, pages..."
            className="w-full border border-border bg-background pl-12 pr-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors rounded-none"
            autoFocus
          />
        </form>
      </div>

      {q.length < 2 ? (
        <div className="text-center py-20">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground">Enter at least 2 characters to search.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border/60 p-5 animate-pulse rounded-none">
              <div className="h-4 bg-secondary/30 rounded w-1/4 mb-3" />
              <div className="h-5 bg-secondary/30 rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary/20 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {contentTypes.map((ct) => {
              const isActive = ct.key === "all" ? !type : type === ct.key;
              return (
                <button
                  key={ct.key}
                  onClick={() => setTypeFilter(ct.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                    isActive
                      ? "border-foreground text-foreground bg-foreground/5"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  }`}
                >
                  <ct.icon className="h-3.5 w-3.5" />
                  {ct.label}
                </button>
              );
            })}
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground mb-6">
            {total} result{total !== 1 ? "s" : ""} for "<span className="text-foreground font-medium">{q}</span>"
            {type && <span> in {type}s</span>}
          </p>

          {/* Results list */}
          {results.length === 0 ? (
            <div className="text-center py-16 border border-border/60">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No results found.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try different keywords or browse the site.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result: SearchResult) => (
                <ResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-10">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 text-xs font-medium border border-border/60 hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-xs font-medium border border-border/60 hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const Icon = typeIcons[result.type] ?? FileText;

  return (
    <Link to={result.url as any} className="group block border border-border/60 p-5 hover:border-foreground/30 hover:bg-secondary/10 transition-all duration-200">
      <div className="flex items-start gap-4">
        {result.thumbnail && (
          <div className="hidden sm:block w-20 h-20 shrink-0 bg-secondary/20 overflow-hidden">
            <img src={result.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium">{result.type}</span>
          </div>
          <h3 className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">{result.title}</h3>
          {result.excerpt && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{result.excerpt}</p>
          )}
          <p className="text-[0.6rem] text-muted-foreground/50 mt-2">
            {new Date(result.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
    </Link>
  );
}
