import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getUserBookmarks,
  getUserBookmarksClient,
  toggleBookmark,
  toggleBookmarkClient,
  type BookmarkedItem,
} from "@/lib/bookmarks";
import { useAuthSession } from "@/hooks/useAuth";
import { isMockMode } from "@/lib/data-source";
import { useLang, formatMoney, timeAgo } from "@/lib/i18n";
import { callFn } from "@/lib/call-fn";
import { getSiteName } from "@/lib/siteSettings";
import { ErrorPage } from "@/components/error-page";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import {
  Bookmark,
  ArrowLeft,
  FileText,
  BookOpen,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/bookmarks")({
  loader: () => getSiteName(),
  head: ({ loaderData }) =>
    seoHead({
      title: "Bookmarks",
      description: "Your bookmarked reflections and books.",
      path: "/bookmarks",
      siteName: loaderData || undefined,
      noIndex: true,
    }),
  component: BookmarksPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

type Tab = "all" | "post" | "book";

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-2xl bg-card border border-border/30"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-lg skeleton-shimmer shrink-0" />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-3 w-20 skeleton-shimmer rounded" />
            <div className="h-4 w-2/3 skeleton-shimmer rounded" />
            <div className="h-3 w-1/3 skeleton-shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BookmarksPage() {
  const { user, loading } = useAuthSession();
  const { lang } = useLang();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const doGetBookmarks = useServerFn(getUserBookmarks);
  const doToggle = useServerFn(toggleBookmark);
  const isMock = isMockMode();

  const {
    data: bookmarks = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["user-bookmarks", user?.id],
    queryFn: () =>
      isMock
        ? getUserBookmarksClient(user?.id)
        : callFn(doGetBookmarks, { userId: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (item: BookmarkedItem) =>
      isMock
        ? toggleBookmarkClient({
            resourceId: item.resourceId,
            resourceType: item.resourceType,
            userId: user?.id,
          })
        : callFn(doToggle, {
            resourceId: item.resourceId,
            resourceType: item.resourceType,
            userId: user?.id,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-bookmarks"] });
      toast.success(lang === "bn" ? "বুকমার্ক থেকে সরানো হয়েছে" : "Removed from bookmarks");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = bookmarks;
  const count = items.length;
  const postCount = items.filter((b) => b.resourceType === "post").length;
  const bookCount = items.filter((b) => b.resourceType === "book").length;
  // Skip slug-less items — a bookmark whose resource was deleted resolves to
  // an empty slug and would render a dead link (/posts/ or /books/).
  const list = items.filter((b) => (tab === "all" || b.resourceType === tab) && !!b.slug);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <div className="h-4 w-24 skeleton-shimmer rounded mb-8" />
        <div className="h-8 w-48 skeleton-shimmer rounded mb-2" />
        <div className="h-4 w-32 skeleton-shimmer rounded mb-8" />
        <SkeletonList />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">
          {lang === "bn" ? "বুকমার্ক" : "Bookmarks"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "bn"
            ? "আপনার বুকমার্ক দেখতে সাইন ইন করুন।"
            : "Sign in to view your bookmarks."}
        </p>
        <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/login"
            search={{
              message: lang === "bn" ? "আপনার বুকমার্ক দেখতে সাইন ইন করুন" : "Sign in to view your bookmarks",
              redirect: "/bookmarks",
            }}
          >
            {lang === "bn" ? "সাইন ইন" : "Sign in"}
          </Link>
        </BrandCtaButton>
      </div>
    );
  }

  const tabs: { key: Tab; labelEn: string; labelBn: string; n?: number }[] = [
    { key: "all", labelEn: "All", labelBn: "সব", n: count },
    { key: "post", labelEn: "Reflections", labelBn: "প্রতিফলন", n: postCount },
    { key: "book", labelEn: "Books", labelBn: "বই", n: bookCount },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
      {/* Back + header */}
      <div className="mb-10">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> {lang === "bn" ? "হোম" : "Home"}
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight mt-4">
          {lang === "bn" ? "বুকমার্ক" : "Bookmarks"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {count}{" "}
          {count === 1
            ? lang === "bn"
              ? "টি সংরক্ষিত"
              : "item saved"
            : lang === "bn"
              ? "টি সংরক্ষিত"
              : "items saved"}
        </p>
      </div>

      {/* Tabs */}
      {count > 0 && (
        <div className="flex gap-1 flex-wrap mb-6">
          {tabs.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all duration-200 ${
                tab === t.key
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              {lang === "bn" ? t.labelBn : t.labelEn}
              {t.n !== undefined && (
                <span className={tab === t.key ? "opacity-70" : "text-muted-foreground/50"}>
                  ({t.n})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground mb-3">
            {lang === "bn"
              ? "বুকমার্ক লোড করা যায়নি।"
              : "Failed to load bookmarks."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && <SkeletonList />}

      {/* Empty — no bookmarks at all */}
      {!isLoading && !isError && count === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-5 ring-1 ring-border/20">
            <Bookmark className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <h2 className="text-lg font-medium mb-2">
            {lang === "bn" ? "এখনো কোনো বুকমার্ক নেই" : "No bookmarks yet"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {lang === "bn"
              ? "পরে পড়ার জন্য প্রতিফলন বা বই বুকমার্ক করুন — সব এখানে পাবেন।"
              : "Bookmark reflections and books to find them here later."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <BrandCtaButton asChild className="px-5 py-2.5 text-xs uppercase tracking-[0.15em]">
              <Link to="/reflections">
                {lang === "bn" ? "প্রতিফলন দেখুন" : "Browse Reflections"}
              </Link>
            </BrandCtaButton>
            <Link
              to="/books"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border border-border/60 rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/40 transition-colors"
            >
              {lang === "bn" ? "বই দেখুন" : "Browse Books"}
            </Link>
          </div>
        </div>
      )}

      {/* Empty — current tab has nothing */}
      {!isLoading && !isError && count > 0 && list.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">
            {tab === "post"
              ? lang === "bn"
                ? "কোনো প্রতিফলন বুকমার্ক করা হয়নি।"
                : "No reflections bookmarked."
              : lang === "bn"
                ? "কোনো বই বুকমার্ক করা হয়নি।"
                : "No books bookmarked."}
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && list.length > 0 && (
        <ul className="space-y-3">
          {list.map((item) => {
            const isBook = item.resourceType === "book";
            const title =
              lang === "bn" && item.titleBn
                ? item.titleBn
                : item.titleEn || item.resourceId;
            const removing = removeMutation.isPending && removeMutation.variables?.id === item.id;
            return (
              <li key={item.id}>
                <div className="group relative rounded-2xl border border-border/40 bg-card p-4 pr-10 shadow-sm hover:border-foreground/20 hover:bg-secondary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <Link
                    to={isBook ? "/books/$slug" : "/posts/$slug"}
                    params={{ slug: item.slug }}
                    search={isBook ? { search: "", page: 1 } : undefined}
                    className="flex items-center gap-4 min-w-0"
                  >
                    {/* Cover / placeholder */}
                    <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-secondary/40 flex items-center justify-center ring-1 ring-black/5 shadow-sm">
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : isBook ? (
                        <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                      ) : (
                        <FileText className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md bg-secondary/40 text-muted-foreground font-medium">
                          {isBook
                            ? lang === "bn"
                              ? "বই"
                              : "Book"
                            : lang === "bn"
                              ? "প্রতিফলন"
                              : "Reflection"}
                        </span>
                        {!isBook && item.category && (
                          <span className="text-xs text-muted-foreground/60">{item.category}</span>
                        )}
                        {isBook && item.authorName && (
                          <span className="text-xs text-muted-foreground/60 truncate">
                            {item.authorName}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50">
                          {timeAgo(item.bookmarkedAt, lang)}
                        </span>
                      </div>
                      <h2 className="text-sm font-medium truncate group-hover:text-[var(--color-saffron)] transition-colors">
                        {title}
                      </h2>
                      {!isBook ? (
                        item.excerptEn && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {lang === "bn" ? item.excerptBn || item.excerptEn : item.excerptEn}
                          </p>
                        )
                      ) : (
                        <p className="text-xs mt-0.5">
                          {item.isFree ? (
                            <span className="text-primary font-medium">
                              {lang === "bn" ? "বিনামূল্যে" : "Free"}
                            </span>
                          ) : (
                            <span className="font-medium text-foreground/80">
                              {formatMoney(Number(item.price ?? 0), lang)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground/30 group-hover:text-[var(--color-saffron)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  {/* Remove (sibling of the Link — never nested) */}
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(item)}
                    disabled={removeMutation.isPending}
                    aria-label={lang === "bn" ? "বুকমার্ক সরান" : "Remove bookmark"}
                    title={lang === "bn" ? "বুকমার্ক সরান" : "Remove bookmark"}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                  >
                    {removing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
