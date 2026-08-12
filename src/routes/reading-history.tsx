import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/hooks/useAuth";
import { getReadingHistory, type ReadingHistoryBook } from "@/lib/reading-history";
import { useLang, timeAgo, toBanglaDigits, pickLocalized } from "@/lib/i18n";
import { getSiteName } from "@/lib/siteSettings";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { BookOpen, ArrowLeft, BookMarked, User } from "lucide-react";

export const Route = createFileRoute("/reading-history")({
  loader: () => getSiteName(),
  head: ({ loaderData }) =>
    seoHead({
      title: "Reading History",
      description: "Your complete reading history.",
      path: "/reading-history",
      siteName: loaderData,
      noIndex: true,
    }),
  component: ReadingHistoryPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function ReadingHistoryPage() {
  const { user, loading } = useAuthSession();
  const { lang } = useLang();

  const { data: history = [] } = useQuery({
    queryKey: ["reading-history-all", user?.id],
    queryFn: () => getReadingHistory(user?.id, 200),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <div className="h-4 w-24 skeleton-shimmer rounded mb-8" />
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-14 w-10 rounded-lg skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 skeleton-shimmer rounded w-3/4" />
                <div className="h-2 skeleton-shimmer rounded w-1/2" />
              </div>
              <div className="h-3 skeleton-shimmer rounded w-12 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">
          {lang === "bn" ? "পড়ার ইতিহাস" : "Reading History"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "bn"
            ? "আপনার পড়ার ইতিহাস দেখতে সাইন ইন করুন।"
            : "Sign in to view your reading history."}
        </p>
        <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/login"
            search={{
              message: lang === "bn" ? "আপনার পড়ার ইতিহাস দেখতে সাইন ইন করুন" : "Sign in to view your reading history",
              redirect: "/reading-history",
            }}
          >
            {lang === "bn" ? "সাইন ইন" : "Sign in"}
          </Link>
        </BrandCtaButton>
      </div>
    );
  }

  const rows = (history as ReadingHistoryBook[]).filter((r) => r.book);

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Link
        to="/profile"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> {lang === "bn" ? "প্রোফাইল" : "Profile"}
      </Link>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <BookMarked className="h-5 w-5 text-[var(--color-saffron)]/70" />
          <h1 className="font-serif text-2xl md:text-3xl tracking-tight">
            {lang === "bn" ? "পড়ার ইতিহাস" : "Reading History"}
          </h1>
          {rows.length > 0 && (
            <span className="text-xs text-muted-foreground">
              · {lang === "bn" ? toBanglaDigits(rows.length) : rows.length}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-10 text-center shadow-sm">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              {lang === "bn"
                ? "এখনো কোনো পড়ার ইতিহাস নেই — একটি বই পড়া শুরু করুন।"
                : "No reading history yet — start reading a book."}
            </p>
            <BrandCtaButton asChild className="mt-6 px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
              <Link to="/books">
                {lang === "bn" ? "বই ব্রাউজ করুন" : "Browse Books"}
              </Link>
            </BrandCtaButton>
          </div>
        ) : (
          <ul className="rounded-2xl border border-border/50 bg-card shadow-sm divide-y divide-border/40 overflow-hidden">
            {rows.map(({ entry, book }) => (
              <li key={entry.id}>
                <Link
                  to="/books/$slug"
                  params={{ slug: book!.slug }}
                  search={{ search: "", page: 1 }}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/30 group"
                >
                  {book!.cover_image ? (
                    <img
                      src={book!.cover_image}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground/40">
                      <BookOpen className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-[var(--color-saffron)] transition-colors">
                      {pickLocalized(book!.title_en, book!.title_bn, lang, "Untitled")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      p.{lang === "bn" ? toBanglaDigits(entry.page) : entry.page}/
                      {lang === "bn" ? toBanglaDigits(entry.totalPages) : entry.totalPages} ·{" "}
                      {lang === "bn" ? toBanglaDigits(entry.progressPct) : entry.progressPct}%
                    </p>
                    <div className="mt-1.5 h-1 bg-secondary/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-saffron)] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(entry.progressPct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50">
                    {timeAgo(entry.timestamp, lang)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
