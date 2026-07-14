import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { searchContent, type SearchResult, type ContentType } from "@/lib/search";
import { Search, FileText, BookOpen, Video, File, Loader2, ArrowLeft, GraduationCap, ArrowUpDown } from "lucide-react";
import DOMPurify from "dompurify";

const contentTypes: { key: ContentType | "all"; label: string; icon: typeof Search }[] = [
  { key: "all", label: "All", icon: Search },
  { key: "post", label: "Reflections", icon: FileText },
  { key: "page", label: "Pages", icon: File },
  { key: "book", label: "Books", icon: BookOpen },
  { key: "video", label: "Videos", icon: Video },
  { key: "course", label: "Courses", icon: GraduationCap },
];

const typeIcons: Record<string, typeof FileText> = {
  post: FileText,
  page: File,
  book: BookOpen,
  video: Video,
  course: GraduationCap,
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
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const searchFn = useServerFn(searchContent);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, type, page, sortBy],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (searchFn as any)({ data: { q, type, page, sort: sortBy } }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });

  const results: SearchResult[] = data?.results ?? [];
  const total = data?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim().length >= 2) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ search: { q: inputValue.trim(), type, page: 1 } } as any);
    }
  };

  const setType = (t: ContentType | "all") => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ search: { q, type: t === "all" ? undefined : t, page: 1 } } as any);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-3 w-3" /> Home
      </Link>

      {/* Search header */}
      <h1 className="font-serif text-3xl md:text-4xl mb-8">Search</h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for reflections, books, pages…"
            className="w-full pl-10 pr-4 py-3 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:border-foreground/40"
            autoFocus
          />
        </div>
      </form>

      {/* Filter tabs + Sort */}
      {q && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 flex-wrap">
            {contentTypes.map((ct) => {
              const Icon = ct.icon;
              const isActive = (ct.key === "all" && !type) || type === ct.key;
              return (
                <button
                  key={ct.key}
                  onClick={() => setType(ct.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {ct.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "relevance" | "date")}
              className="text-xs bg-background border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none focus:border-foreground/40"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Newest</option>
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-secondary/20 animate-pulse">
              <div className="w-16 h-16 rounded-lg bg-secondary/40 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary/40 rounded w-1/3" />
                <div className="h-3 bg-secondary/30 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 && q ? (
        <div className="text-center py-16">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">No results found</h2>
          <p className="text-sm text-muted-foreground">
            Try different keywords or browse our content directly.
          </p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground mb-4">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>
          <div className="space-y-3">
            {results.map((result) => (
              <ResultCard key={`${result.type}-${result.id}`} result={result} />
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Link
                  to="/search"
                  search={{ q, type, page: Math.max(1, page - 1) }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    page === 1
                      ? "border-border/40 text-muted-foreground/40 pointer-events-none"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  Previous
                </Link>
                <Link
                  to="/search"
                  search={{ q, type, page: page + 1 }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    results.length < 20
                      ? "border-border/40 text-muted-foreground/40 pointer-events-none"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const Icon = typeIcons[result.type] || FileText;
  return (
    <Link
      to={result.url}
      className="flex gap-4 p-4 rounded-xl border border-border/40 hover:border-foreground/20 hover:bg-secondary/20 transition-all group"
    >
      {result.thumbnail ? (
        <img
          src={result.thumbnail}
          alt={result.title}
          className="w-16 h-16 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/60 font-medium">
            {result.type}
          </span>
          <span className="text-[0.5rem] text-muted-foreground/40">
            {new Date(result.created_at).toLocaleDateString()}
          </span>
        </div>
        <h3
          className="text-sm font-medium group-hover:text-foreground transition-colors line-clamp-1"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.highlightedTitle || result.title, { ALLOWED_TAGS: ["mark"] }) }}
        />
        {result.excerpt && (
          <p
            className="text-xs text-muted-foreground mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.highlightedExcerpt || result.excerpt, { ALLOWED_TAGS: ["mark"] }) }}
          />
        )}
      </div>
    </Link>
  );
}
