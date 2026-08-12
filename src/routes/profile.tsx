import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getUserBookmarks,
  getUserBookmarksClient,
  type BookmarkedItem,
} from "@/lib/bookmarks";
import { callFn } from "@/lib/call-fn";
import { isMockMode } from "@/lib/data-source";
import { mockGetProfile } from "@/lib/mock-session";
import { mockCountUserComments } from "@/lib/mock-comments";
import { mockGetPurchases } from "@/lib/mock-commerce";
import { mockGetUserProgress } from "@/lib/mock-progress";
import {
  getRecentBooks,
  getReadingHistory,
  type ReadingHistoryBook,
} from "@/lib/reading-history";
import { getReadingStats } from "@/lib/reading-stats";
import { getSiteName } from "@/lib/siteSettings";
import { useLang, timeAgo, toBanglaDigits, formatDate } from "@/lib/i18n";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import {
  User,
  Mail,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Settings,
  BookOpen,
  TrendingUp,
  Pencil,
  Heart,
  Bookmark,
  BookMarked,
  ShoppingBag,
  ChevronRight,
  Bell,
  CheckCheck,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => seoHead({
    title: "Profile",
    description: "Your profile and reading activity.",
    path: "/profile",
    siteName: loaderData,
    noIndex: true,
  }),
  component: ProfilePage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function ProfilePage() {
  const { user, loading } = useAuthSession();
  const { lang } = useLang();
  const doGetBookmarks = useServerFn(getUserBookmarks);

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Mock mode — read from the mock profiles store
      if (isMockMode()) {
        const p = mockGetProfile(user.id);
        if (!p) return null;
        return {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          bio: p.bio,
          created_at: p.created_at,
        };
      }
      const db = supabase;
      const { data } = await db
        .from("profiles")
        .select("display_name, avatar_url, bio, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as {
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        created_at: string;
      } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: commentCount } = useQuery({
    queryKey: ["user-comment-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      if (isMockMode()) return mockCountUserComments(user.id);
      const db = supabase;
      const { count } = await db
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  /* ── Notifications (latest, topic-gated like the header bell) ── */
  const {
    visible: visibleNotifications,
    unread: unreadNotifications,
    markRead,
    markAllRead,
  } = useNotifications(user?.id ?? null);

  /* ── Bookmarks (posts + books) ─────────────────────────────── */
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["user-bookmarks", user?.id],
    queryFn: () =>
      isMockMode()
        ? getUserBookmarksClient(user?.id)
        : callFn(doGetBookmarks, { userId: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  /* ── Recent Books (reading history, mock-first) ────────────── */
  const { data: recentBooks = [] } = useQuery({
    queryKey: ["recent-books", user?.id],
    queryFn: () => getRecentBooks(user?.id, 6),
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: readingHistory = [] } = useQuery({
    queryKey: ["reading-history", user?.id],
    queryFn: () => getReadingHistory(user?.id, 12),
    enabled: !!user,
    staleTime: 30_000,
  });

  /* ── Streak (from the history-derived stats — B4 2026-08-12) ── */
  const { data: streakData } = useQuery({
    queryKey: ["reading-streak", user?.id],
    queryFn: () => getReadingStats(user?.id),
    enabled: !!user,
    staleTime: 30_000,
  });
  const streak = streakData?.currentStreak ?? 0;

  const { data: readingStats } = useQuery({
    queryKey: ["user-reading-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      if (isMockMode()) {
        // M3 — real mock reading stats from the mock stores.
        const [progress, purchases] = await Promise.all([
          mockGetUserProgress(user.id),
          mockGetPurchases(user.id),
        ]);
        const completedBooks = progress.filter((p) => p.completed).length;
        const inProgress = progress.filter(
          (p) => p.progress_pct > 0 && !p.completed,
        ).length;
        const avgProgress =
          progress.length > 0
            ? Math.round(
                progress.reduce((s, p) => s + p.progress_pct, 0) / progress.length,
              )
            : 0;
        return {
          totalPurchased: purchases.length,
          completedBooks,
          inProgress,
          avgProgress,
        };
      }
      const db = supabase;
      const [progressResult, purchaseResult] = await Promise.all([
        db
          .from("reading_progress")
          .select("progress")
          .eq("user_id", user.id),
        db
          .from("purchases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      const progressData = progressResult.data ?? [];
      const completedBooks = progressData.filter(
        (p: any) => Number(p.progress) >= 100
      ).length;
      const inProgress = progressData.filter(
        (p: any) => Number(p.progress) > 0 && Number(p.progress) < 100
      ).length;
      const avgProgress =
        progressData.length > 0
          ? Math.round(
              progressData.reduce(
                (s: number, p: any) => s + Number(p.progress),
                0
              ) / progressData.length
            )
          : 0;
      return {
        totalPurchased: purchaseResult.count ?? 0,
        completedBooks,
        inProgress,
        avgProgress,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Gate on session loading so SSR guest-render never flashes before hydration
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <div className="h-4 w-24 skeleton-shimmer rounded mb-8" />
        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-full skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-5 w-40 skeleton-shimmer rounded" />
              <div className="h-4 w-56 skeleton-shimmer rounded" />
              <div className="h-3 w-32 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 skeleton-shimmer rounded" style={{ animationDelay: `${i * 60}ms` }} />
                <div className="h-4 w-12 skeleton-shimmer rounded" style={{ animationDelay: `${i * 60}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">{lang === "bn" ? "প্রোফাইল" : "Profile"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "bn" ? "আপনার প্রোফাইল দেখতে ও সম্পাদনা করতে সাইন ইন করুন।" : "Sign in to view and edit your profile."}
        </p>
        <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/login"
            search={{
              message: lang === "bn" ? "আপনার প্রোফাইল দেখতে সাইন ইন করুন" : "Sign in to view your profile",
              redirect: "/profile",
            }}
          >
            {lang === "bn" ? "সাইন ইন" : "Sign in"}
          </Link>
        </BrandCtaButton>
      </div>
    );
  }

  const initials = (profile?.display_name || user.email || "U")
    .charAt(0)
    .toUpperCase();
  const memberSince = profile?.created_at
    ? formatDate(profile.created_at, lang, { year: "numeric", month: "long" })
    : "N/A";

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Link
        to="/"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> {lang === "bn" ? "হোম" : "Home"}
      </Link>

      <div className="mt-8 space-y-5">
        {/* ── Identity Card (display only — editing moved to /settings) ── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-saffron-100)] to-[var(--color-saffron-200)] dark:from-saffron-900 dark:to-saffron-800 flex items-center justify-center text-xl font-medium text-[var(--color-saffron-700)] dark:text-[var(--color-saffron-300)] shrink-0 ring-2 ring-[var(--color-saffron)]/20">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "Profile avatar"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                  {profile?.display_name || (lang === "bn" ? "বেনামী" : "Anonymous")}
                </h1>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>

              {/* Bio (read-only here) */}
              {profile?.bio && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              {/* Edit profile → /settings */}
              <Link
                to="/settings"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {lang === "bn" ? "প্রোফাইল সম্পাদনা করুন" : "Edit profile"}
              </Link>

              {/* Streak chip — B4 2026-08-12 (links to the reading stats page) */}
              {streak > 0 && (
                <Link
                  to="/stats"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:shadow-sm transition-all duration-300"
                >
                  <span aria-hidden>🔥</span>
                  {lang === "bn"
                    ? `${toBanglaDigits(streak)} দিনের ধারাবাহিকতা`
                    : `${streak}-day streak`}
                </Link>
              )}
            </div>
          </div>

          {/* ── Stats Grid ─────────────────────────────────────────── */}
          <div className="mt-6 pt-6 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
                  {lang === "bn" ? "সদস্য হয়েছেন" : "Member since"}
                </p>
                <p className="text-sm">{memberSince}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
                  {lang === "bn" ? "মন্তব্য" : "Comments"}
                </p>
                <p className="text-sm">{lang === "bn" ? toBanglaDigits(commentCount ?? 0) : commentCount ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
                  {lang === "bn" ? "পড়া বই" : "Books read"}
                </p>
                <p className="text-sm">{lang === "bn" ? toBanglaDigits(readingStats?.completedBooks ?? 0) : readingStats?.completedBooks ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
                  {lang === "bn" ? "গড় অগ্রগতি" : "Avg progress"}
                </p>
                <p className="text-sm">{lang === "bn" ? toBanglaDigits(readingStats?.avgProgress ?? 0) : readingStats?.avgProgress ?? 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notifications (latest — mirror of the header bell) ── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground mb-3">
            <Bell className="h-4 w-4 text-[var(--color-saffron)]/70" />
            <span className="font-medium">{lang === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}</span>
            <Link
              to="/notifications"
              className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === "bn" ? "সব দেখুন" : "View all"}
              <ChevronRight className="h-3 w-3" />
            </Link>
            {unreadNotifications > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                {lang === "bn" ? "সব পড়া হয়েছে" : "Mark all read"}
              </button>
            )}
          </div>
          {visibleNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">
              {lang === "bn" ? "এখনো কোনো বিজ্ঞপ্তি নেই।" : "No notifications yet."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {visibleNotifications.slice(0, 5).map((n) => {
                const row = (
                  <span
                    className={`-mx-2 flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                        n.read ? "bg-transparent" : "bg-destructive"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{n.message}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50">
                      {timeAgo(n.createdAt, lang)}
                    </span>
                  </span>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => markRead(n.id)}
                        className="block rounded-md transition-colors hover:bg-secondary/30"
                      >
                        {row}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="block w-full rounded-md transition-colors hover:bg-secondary/30"
                      >
                        {row}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Bookmarks (posts + books) ──────────────────────────── */}
        {(bookmarks as BookmarkedItem[]).length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-foreground mb-3">
              <Bookmark className="h-4 w-4 text-[var(--color-saffron)]/70" />
              <span className="font-medium">{lang === "bn" ? "বুকমার্ক" : "Bookmarks"}</span>
              <span className="text-xs text-muted-foreground">
                {lang === "bn" ? toBanglaDigits((bookmarks as BookmarkedItem[]).length) : (bookmarks as BookmarkedItem[]).length}
              </span>
              <Link
                to="/bookmarks"
                className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {lang === "bn" ? "সব দেখুন" : "View all"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-1">
              {(bookmarks as BookmarkedItem[]).map((item) => (
                <li key={item.id}>
                  <Link
                    to={
                      item.resourceType === "book"
                        ? "/books/$slug"
                        : "/posts/$slug"
                    }
                    params={{ slug: item.slug || "" }}
                    search={
                      item.resourceType === "book"
                        ? { search: "", page: 1 }
                        : undefined
                    }
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground/50 w-12 shrink-0">
                      {item.resourceType === "book"
                        ? lang === "bn" ? "বই" : "Book"
                        : lang === "bn" ? "পোস্ট" : "Post"}
                    </span>
                    <span className="truncate group-hover:underline">
                      {item.titleEn || item.titleBn || item.resourceId}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Library Summary — responsive icon cards. On mobile they
               stack full-width with a leading icon; sm+ lays them 3-across. ── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground mb-4">
            <Heart className="h-4 w-4 text-[var(--color-saffron)]/70" />
            <span className="font-medium">{lang === "bn" ? "লাইব্রেরি" : "Library"}</span>
            <Link
              to="/purchases"
              className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === "bn" ? "সব দেখুন" : "View all"}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/purchases"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200 min-w-0"
            >
              <span className="w-9 h-9 shrink-0 rounded-full bg-[var(--color-saffron)]/10 text-[var(--color-saffron)] flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold leading-none tabular-nums">{lang === "bn" ? toBanglaDigits(readingStats?.totalPurchased ?? 0) : readingStats?.totalPurchased ?? 0}</span>
                <span className="block mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground truncate">{lang === "bn" ? "ক্রয়কৃত" : "Purchased"}</span>
              </span>
            </Link>
            <Link
              to="/stats"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200 min-w-0"
            >
              <span className="w-9 h-9 shrink-0 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold leading-none tabular-nums">{lang === "bn" ? toBanglaDigits(readingStats?.inProgress ?? 0) : readingStats?.inProgress ?? 0}</span>
                <span className="block mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground truncate">{lang === "bn" ? "চলমান" : "In progress"}</span>
              </span>
            </Link>
            <Link
              to="/stats"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200 min-w-0"
            >
              <span className="w-9 h-9 shrink-0 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                <BookMarked className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold leading-none tabular-nums">{lang === "bn" ? toBanglaDigits(readingStats?.completedBooks ?? 0) : readingStats?.completedBooks ?? 0}</span>
                <span className="block mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground truncate">{lang === "bn" ? "সম্পন্ন" : "Completed"}</span>
              </span>
            </Link>
          </div>
        </div>

        {/* ── Reading History ───────────────────────────────────── */}
        {(readingHistory as ReadingHistoryBook[]).filter((r) => r.book).length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-foreground mb-4">
              <TrendingUp className="h-4 w-4 text-[var(--color-saffron)]/70" />
              <span className="font-medium">
                {lang === "bn" ? "পড়ার ইতিহাস" : "Reading History"}
              </span>
              <Link
                to="/reading-history"
                className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {lang === "bn" ? "সব দেখুন" : "View all"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-1">
              {(readingHistory as ReadingHistoryBook[])
                .filter((r) => r.book)
                .slice(0, 8)
                .map(({ entry, book }) => (
                  <li key={entry.id}>
                    <Link
                      to="/books/$slug"
                      params={{ slug: book!.slug }}
                      search={{ search: "", page: 1 }}
                      className="flex items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <span className="truncate group-hover:underline">
                        {lang === "bn" ? book!.title_bn : book!.title_en}
                      </span>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/60">
                        p.{lang === "bn" ? toBanglaDigits(entry.page) : entry.page}/{lang === "bn" ? toBanglaDigits(entry.totalPages) : entry.totalPages} · {lang === "bn" ? toBanglaDigits(entry.progressPct) : entry.progressPct}%
                      </span>
                      <span className="w-14 shrink-0 text-right text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50">
                        {timeAgo(entry.timestamp, lang)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* ── Recent Books ───────────────────────────────────────── */}
        {(recentBooks as ReadingHistoryBook[]).filter((r) => r.book).length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-foreground mb-4">
              <BookOpen className="h-4 w-4 text-[var(--color-saffron)]/70" />
              <span className="font-medium">
                {lang === "bn" ? "সম্প্রতি পড়া বই" : "Recent Books"}
              </span>
            </div>
            <ul className="space-y-1">
              {(recentBooks as ReadingHistoryBook[])
                .filter((r) => r.book)
                .map(({ entry, book }) => (
                  <li key={entry.id}>
                    <Link
                      to="/books/$slug"
                      params={{ slug: book!.slug }}
                      search={{ search: "", page: 1 }}
                      className="flex items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <span className="w-1 shrink-0 self-stretch rounded-full"
                        style={{ backgroundColor: "var(--color-saffron)" }} />
                      <span className="truncate group-hover:underline">
                        {lang === "bn" ? book!.title_bn : book!.title_en}
                      </span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground/60 shrink-0">
                        {lang === "bn" ? toBanglaDigits(entry.progressPct) : entry.progressPct}%
                      </span>
                      <span className="hidden sm:block text-[10px] uppercase tracking-[0.08em] text-muted-foreground/50 shrink-0">
                        p.{lang === "bn" ? toBanglaDigits(entry.page) : entry.page}/{lang === "bn" ? toBanglaDigits(entry.totalPages) : entry.totalPages}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* ── Quick links grid ──────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/stats"
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200"
          >
            <TrendingUp className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
            <span className="text-sm font-medium">
              {lang === "bn" ? "পড়ার পরিসংখ্যান" : "Reading statistics"}
            </span>
            <ArrowLeft className="h-3 w-3 rotate-180 ml-auto text-muted-foreground/40 group-hover:text-[var(--color-saffron)] transition-colors" />
          </Link>
          <Link
            to="/orders"
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200"
          >
            <ShoppingBag className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
            <span className="text-sm font-medium">
              {lang === "bn" ? "অর্ডার ও রসিদ" : "Orders & receipts"}
            </span>
            <ArrowLeft className="h-3 w-3 rotate-180 ml-auto text-muted-foreground/40 group-hover:text-[var(--color-saffron)] transition-colors" />
          </Link>
          <Link
            to="/settings"
            hash="appearance"
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200"
          >
            <Settings className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
            <span className="text-sm font-medium">
              {lang === "bn" ? "চেহারা ও পছন্দ" : "Appearance & preferences"}
            </span>
            <ArrowLeft className="h-3 w-3 rotate-180 ml-auto text-muted-foreground/40 group-hover:text-[var(--color-saffron)] transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
