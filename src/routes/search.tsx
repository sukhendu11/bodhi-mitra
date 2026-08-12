import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { searchContent, type SearchResult, type ContentType } from "@/lib/search";
import { useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized, formatDate, toBanglaDigits } from "@/lib/i18n";
import { Search, Feather, BookOpen, Video, File, Loader2, ArrowLeft, ChevronDown, Sparkles } from "lucide-react";
import DOMPurify from "dompurify";
import { seoHead } from "@/lib/seo";
import { callFn } from "@/lib/call-fn";

const contentTypes: { key: ContentType | "all"; labelEn: string; labelBn: string; icon: typeof Search }[] = [
  { key: "all", labelEn: "All", labelBn: "সব", icon: Search },
  { key: "post", labelEn: "Reflections", labelBn: "প্রতিফলন", icon: Feather },
  { key: "page", labelEn: "Pages", labelBn: "পৃষ্ঠা", icon: File },
  { key: "book", labelEn: "Books", labelBn: "বই", icon: BookOpen },
  { key: "video", labelEn: "Videos", labelBn: "ভিডিও", icon: Video },
];

const typeIcons: Record<string, typeof Feather> = {
  post: Feather,
  page: File,
  book: BookOpen,
  video: Video,
};

/** Popular search suggestions shown before the user has typed. */
const POPULAR_SEARCHES = [
  { labelEn: "Meditation", labelBn: "ধ্যান" },
  { labelEn: "Mindfulness", labelBn: "মাইন্ডফুলনেস" },
  { labelEn: "Buddha", labelBn: "বুদ্ধ" },
  { labelEn: "Compassion", labelBn: "করুণা" },
  { labelEn: "Books", labelBn: "বই" },
];

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    type: (search.type as ContentType | undefined) ?? undefined,
    page: (search.page as number) ?? 1,
  }),
  head: () => seoHead({
    title: "Search",
    description: "Search reflections, books, videos, and more on Sabbe Satta.",
    path: "/search",
    noIndex: true,
  }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const { q, type, page } = Route.useSearch();
  const cfg = useSiteSettings();
  const { lang } = useLang();
  const [inputValue, setInputValue] = useState(q);
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const searchFn = useServerFn(searchContent);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["search", q, type, page, sortBy],
    queryFn: () => callFn(searchFn, { q, type, page, sort: sortBy }),
    enabled: q.length >= 2,
    staleTime: 30_000,
    retry: 0,
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

  const jumpToSearch = (term: string) => {
    setInputValue(term);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ search: { q: term, type, page: 1 } } as any);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-3 w-3" /> {lang === "bn" ? "হোম" : "Home"}
      </Link>

      {/* Search header */}
      <h1 className="font-serif text-3xl md:text-4xl mb-2">{pickLocalized(cfg.search.title_en, cfg.search.title_bn, lang, "Search")}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {lang === "bn"
          ? "প্রতিফলন, বই, ভিডিও ও আরও অনেক কিছু খুঁজুন।"
          : "Reflections, books, videos, and more — all in one place."}
      </p>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-[var(--color-saffron)]" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={lang === "bn" ? "প্রতিফলন, বই, ভিডিও খুঁজুন…" : "Search reflections, books, pages…"}
            className="w-full pl-11 pr-4 py-3.5 text-sm bg-background border border-border/60 rounded-xl shadow-sm placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200"
            autoFocus
          />
        </div>
      </form>

      {/* Filter tabs + Sort */}
      {q && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-1 flex-wrap">
            {contentTypes.map((ct) => {
              const Icon = ct.icon;
              const isActive = (ct.key === "all" && !type) || type === ct.key;
              return (
                <button
                  key={ct.key}
                  onClick={() => setType(ct.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {lang === "bn" ? ct.labelBn : ct.labelEn}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "relevance" | "date")}
              aria-label={lang === "bn" ? "ফলাফল সাজান" : "Sort results"}
              className="appearance-none text-xs bg-background border border-border/60 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:border-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors duration-200 cursor-pointer"
            >
              <option value="relevance">{lang === "bn" ? "প্রাসঙ্গিকতা" : "Relevance"}</option>
              <option value="date">{lang === "bn" ? "নতুন" : "Newest"}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Popular searches (no query yet) */}
      {!q && (
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] text-muted-foreground font-medium mb-3">
            <Sparkles className="h-3 w-3 text-[var(--color-saffron)]" />
            {lang === "bn" ? "জনপ্রিয় খোঁজ" : "Popular searches"}
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s.labelEn}
                onClick={() => jumpToSearch(lang === "bn" ? s.labelBn : s.labelEn)}
                className="px-3 py-1.5 text-xs rounded-full border border-border/50 bg-background hover:border-[var(--color-saffron)]/40 hover:text-[var(--color-saffron)] hover:-translate-y-0.5 transition-all duration-200"
              >
                {lang === "bn" ? s.labelBn : s.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-background border border-border/30" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-16 h-16 rounded-lg skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 skeleton-shimmer rounded w-1/3" />
                <div className="h-3 skeleton-shimmer rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground mb-3">
            {lang === "bn" ? "অনুসন্ধান ব্যর্থ হয়েছে।" : "Search failed."}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"}
          </button>
        </div>
      ) : results.length === 0 && q ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-5 ring-1 ring-border/20">
            <Search className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <h2 className="text-lg font-medium mb-2">{lang === "bn" ? "কোনো ফলাফল পাওয়া যায়নি" : "No results found"}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {lang === "bn" ? "ভিন্ন কীওয়ার্ড চেষ্টা করুন অথবা সরাসরি আমাদের কনটেন্ট ব্রাউজ করুন।" : "Try different keywords or browse our content directly."}
          </p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground mb-4">
            {lang === "bn"
              ? `"${q}" এর জন্য মোট ${toBanglaDigits(total)}টি ফলাফল`
              : `${total} result${total !== 1 ? "s" : ""} for “${q}”`}
          </p>
          <div className="space-y-3">
            {results.map((result) => (
              <ResultCard key={`${result.type}-${result.id}`} result={result} />
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center mt-8 pt-6 border-t border-border/40">
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
                  {lang === "bn" ? "পূর্ববর্তী" : "Previous"}
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
                  {lang === "bn" ? "পরবর্তী" : "Next"}
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
  const Icon = typeIcons[result.type] || Feather;
  const { lang } = useLang();
  const typeLabel: Record<string, string> = {
    post: lang === "bn" ? "প্রতিফলন" : "Reflection",
    page: lang === "bn" ? "পৃষ্ঠা" : "Page",
    book: lang === "bn" ? "বই" : "Book",
    video: lang === "bn" ? "ভিডিও" : "Video",
  };
  return (
    <Link
      to={result.url}
      className="group flex gap-4 p-4 rounded-xl bg-card border border-border/40 hover:border-foreground/20 hover:bg-secondary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      {result.thumbnail ? (
        <img
          src={result.thumbnail}
          alt={result.title}
          className="w-16 h-16 rounded-lg object-cover shrink-0 shadow-sm ring-1 ring-black/5"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5">
          <Icon className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md bg-secondary/40 text-muted-foreground font-medium">
            <Icon className="h-2.5 w-2.5" />
            {typeLabel[result.type] ?? result.type}
          </span>
          <span className="text-xs text-muted-foreground/40">
            {formatDate(result.created_at, lang, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <h3
          className="text-sm font-medium group-hover:text-[var(--color-saffron)] transition-colors line-clamp-1"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.highlightedTitle || result.title, { ALLOWED_TAGS: ["mark"] }) }}
        />
        {result.excerpt && (
          <p
            className="text-xs text-muted-foreground mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.highlightedExcerpt || result.excerpt, { ALLOWED_TAGS: ["mark"] }) }}
          />
        )}
      </div>
      <span className="hidden sm:flex items-center text-muted-foreground/30 group-hover:text-[var(--color-saffron)] group-hover:translate-x-0.5 transition-all duration-200 shrink-0">
        →
      </span>
    </Link>
  );
}
