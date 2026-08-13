import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, toBanglaDigits, formatDate } from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";
import { seoHead } from "@/lib/seo";
import { getSiteName } from "@/lib/siteSettings";
import { ErrorPage } from "@/components/error-page";
import {
  getReadingStats,
  formatDuration,
  CHART_DAYS,
  STREAK_STRIP_DAYS,
  type ReadingStats,
} from "@/lib/reading-stats";
import { BackLink } from "@/components/BackLink";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { StatCard, StatGrid } from "@/components/StatCard";
import {
  ArrowLeft,
  CalendarRange,
  Flame,
  BookOpen,
  Clock,
  Loader2,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/stats")({
  loader: () => getSiteName(),
  head: ({ loaderData }) =>
    seoHead({
      title: "Reading Statistics",
      description: "Your reading streaks, pages read, and time spent per book.",
      path: "/stats",
      siteName: loaderData,
      noIndex: true,
    }),
  component: StatsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const SAFRON = "#d35400";

function useIsDark() {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const compute = () =>
      setIsDark(
        theme === "dark" ||
          (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches),
      );
    compute();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", compute);
      return () => mq.removeEventListener("change", compute);
    }
  }, [theme]);
  return isDark;
}

function t(lang: string, en: string, bn: string) {
  return lang === "bn" ? bn : en;
}

function StatsPage() {
  const { user, loading } = useAuthSession();
  const { lang } = useLang();
  const isDark = useIsDark();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["reading-stats", user?.id],
    queryFn: () => getReadingStats(user?.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  // ECharts must only mount client-side (SSR-safe guard)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartOption = useMemo(() => {
    const days = (stats?.days ?? []).slice(-CHART_DAYS);
    const axis = isDark ? "#a1a1aa" : "#71717a";
    const split = isDark ? "#27272a" : "#e4e4e7";
    // Localized short day labels — `formatDate` renders en-US (matching the
    // stored `d.label`, which is always en-US) and bn-BD with forced Bengali
    // numerals for Bangla mode.
    const axisLabels = days.map((d) =>
      formatDate(`${d.date}T12:00:00`, lang, {
        month: "short",
        day: "numeric",
      }),
    );
    return {
      grid: { left: 40, right: 12, top: 28, bottom: 30 },
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        borderColor: split,
        textStyle: { color: isDark ? "#fafafa" : "#18181b", fontSize: 12 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const day = days[p.dataIndex];
          const time = day ? formatDuration(day.timeMs, lang) : lang === "bn" ? "০ মিনিট" : "0m";
          const pages = day?.pages ?? 0;
          const label = axisLabels[p.dataIndex] ?? "";
          return lang === "bn"
            ? `${label}<br/>${toBanglaDigits(pages)} পৃষ্ঠা · ${time}`
            : `${label}<br/>${pages} ${pages === 1 ? "page" : "pages"} · ${time}`;
        },
      },
      xAxis: {
        type: "category" as const,
        data: axisLabels,
        axisLabel: { color: axis, fontSize: 10 },
        axisLine: { lineStyle: { color: split } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value" as const,
        minInterval: 1,
        axisLabel: {
          color: axis,
          fontSize: 10,
          formatter: (v: number) => (lang === "bn" ? toBanglaDigits(v) : String(v)),
        },
        splitLine: { lineStyle: { color: split } },
      },
      series: [
        {
          type: "bar" as const,
          data: days.map((d) => d.pages),
          barWidth: "55%",
          itemStyle: {
            borderRadius: [5, 5, 0, 0],
            color: SAFRON,
          },
          emphasis: { itemStyle: { color: "#e67e22" } },
        },
      ],
    };
  }, [stats, isDark, lang]);

  const days = stats?.days ?? [];
  const books = stats?.books ?? [];

  const skeleton = (
    <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
      {/* Header line */}
      <div className="h-5 w-48 skeleton-shimmer rounded mb-8" />
      {/* Stat cards — same 2/4 grid as the real layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border/60 rounded-xl p-4 space-y-3">
            <div className="h-3 w-20 skeleton-shimmer rounded" style={{ animationDelay: `${i * 70}ms` }} />
            <div className="h-6 w-14 skeleton-shimmer rounded" style={{ animationDelay: `${i * 70}ms` }} />
          </div>
        ))}
      </div>
      {/* Chart card */}
      <div className="mt-6 border border-border/60 rounded-xl p-5">
        <div className="h-4 w-40 skeleton-shimmer rounded mb-5" />
        <div className="h-48 skeleton-shimmer rounded-lg" />
      </div>
      {/* Streak strip card */}
      <div className="mt-6 border border-border/60 rounded-xl p-5">
        <div className="h-4 w-28 skeleton-shimmer rounded mb-4" />
        <div className="flex gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 skeleton-shimmer rounded-md"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Gates ──────────────────────────────────────────────────────
  if (loading) return skeleton;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">
          {t(lang, "Reading Statistics", "পড়ার পরিসংখ্যান")}
        </h1>
        <p className="text-base text-muted-foreground mb-6">
          {t(
            lang,
            "Sign in to see your reading streaks, pages read, and time spent per book.",
            "সাইন ইন করুন আপনার পড়ার ধারা, পঠিত পৃষ্ঠা এবং প্রতি বইয়ে ব্যয়িত সময় দেখতে।",
          )}
        </p>
        <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/login"
            search={{ message: "Sign in to view reading statistics", redirect: "/stats" }}
          >
            {t(lang, "Sign in", "সাইন ইন")}
          </Link>
        </BrandCtaButton>
      </div>
    );
  }

  if (isLoading || !stats) return skeleton;

  const empty = stats.totalSessions === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
      <BackLink to="/profile" label={t(lang, "Back to profile", "প্রোফাইলে ফিরুন")} />

      <header className="mt-8 mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          {t(lang, "Reading Statistics", "পড়ার পরিসংখ্যান")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-xl leading-relaxed">
          {t(
            lang,
            "A quiet look at your reading practice — streaks, pages turned, and time spent with each book.",
            "আপনার পড়ার অভ্যাসের একটি নীরব দৃষ্টিপাত — ধারা, পঠিত পৃষ্ঠা এবং প্রতিটি বইয়ে ব্যয়িত সময়।",
          )}
        </p>
      </header>

      {empty ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          {/* ── Stat cards ─────────────────────────────────────── */}
          <StatGrid columns={4} className="gap-4">
            <StatCard layout="stacked" icon={<Flame className="h-4 w-4" />} value={lang === "bn" ? toBanglaDigits(stats.currentStreak) : stats.currentStreak} suffix={t(lang, "days", "দিন")} label={t(lang, "Current streak", "বর্তমান ধারা")} />
            <StatCard layout="stacked" icon={<BookOpen className="h-4 w-4" />} value={lang === "bn" ? toBanglaDigits(stats.totalPagesRead) : stats.totalPagesRead} suffix={t(lang, "pages", "পৃষ্ঠা")} label={t(lang, "Pages read", "পঠিত পৃষ্ঠা")} />
            <StatCard layout="stacked" icon={<Clock className="h-4 w-4" />} value={formatDuration(stats.totalTimeMs, lang)} suffix="" label={t(lang, "Reading time", "পড়ার সময়")} />
            <StatCard layout="stacked" icon={<CalendarRange className="h-4 w-4" />} value={lang === "bn" ? toBanglaDigits(stats.activeDays) : stats.activeDays} suffix={t(lang, "days", "দিন")} label={t(lang, "Active days", "সক্রিয় দিন")} />
          </StatGrid>

          {/* ── Pages per day chart ───────────────────────────── */}
          <section className="mt-8 border border-border/60 rounded-xl p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
              <h2 className="text-base font-medium text-foreground">
                {t(lang, "Pages read — last 14 days", "গত ১৪ দিনে পঠিত পৃষ্ঠা")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t(lang, "longest streak", "দীর্ঘতম ধারা")}: {lang === "bn" ? toBanglaDigits(stats.longestStreak) : stats.longestStreak}{" "}
                {t(lang, "days", "দিন")} · {t(lang, "avg session", "গড় সেশন")}:{" "}
                {formatDuration(stats.avgSessionMinutes * 60_000, lang)}
              </span>
            </div>
            {days.length === 0 && !isLoading ? (
              <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                {t(lang, "No chart data yet — start reading to see your daily pages.", "এখনো কোনো চার্ট তথ্য নেই — দৈনিক পৃষ্ঠা দেখতে পড়া শুরু করুন।")}
              </div>
            ) : mounted ? (
              <ReactECharts option={chartOption} style={{ height: 240 }} notMerge />
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                {t(lang, "Loading chart…", "চার্ট লোড হচ্ছে…")}
              </div>
            )}
          </section>

          {/* ── Streak strip ───────────────────────────────────── */}
          <section className="mt-6 border border-border/60 rounded-xl p-5">
            <h2 className="text-base font-medium text-foreground mb-4">
              {t(lang, "Last 28 days", "গত ২৮ দিন")}
            </h2>
            <StreakStrip stats={stats} lang={lang} />
            <p className="mt-3 text-xs text-muted-foreground">
              {stats.currentStreak > 0
                ? t(
                    lang,
                    `You've read ${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"} in a row.`,
                    `আপনি টানা ${toBanglaDigits(stats.currentStreak)} দিন পড়েছেন।`,
                  )
                : t(
                    lang,
                    "Read today to start a new streak.",
                    "নতুন ধারা শুরু করতে আজ পড়ুন।",
                  )}
            </p>
          </section>

          {/* ── Time per book ──────────────────────────────────── */}
          {books.length > 0 && (
            <section className="mt-6 border border-border/60 rounded-xl p-5">
              <h2 className="text-base font-medium text-foreground mb-4">
                {t(lang, "Time per book", "প্রতি বইয়ে সময়")}
              </h2>
              <div className="space-y-3">
                {books.map((b) => (
                  <Link
                    key={b.bookId}
                    to="/books/$slug"
                    params={{ slug: b.slug || b.bookId }}
                    search={{ search: "", page: 1 }}
                    className="flex items-center gap-3 group"
                  >
                    {b.coverImage ? (
                      <img
                        src={b.coverImage}
                        alt=""
                        className="h-14 w-10 object-cover rounded-md shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-10 rounded-md bg-secondary/50 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground truncate group-hover:underline">
                        {lang === "bn" && b.titleBn ? b.titleBn : b.titleEn}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-secondary/60 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(2, b.progressPct)}%`,
                              backgroundColor: "var(--color-saffron)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                          {lang === "bn" ? toBanglaDigits(b.progressPct) : b.progressPct}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground tabular-nums">
                        {formatDuration(b.timeMs, lang)}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                        {lang === "bn" ? toBanglaDigits(b.pagesRead) : b.pagesRead} {t(lang, "pages", "পৃষ্ঠা")} · {lang === "bn" ? toBanglaDigits(b.sessions) : b.sessions}{" "}
                        {t(lang, "sessions", "সেশন")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StreakStrip({ stats, lang }: { stats: ReadingStats; lang: "en" | "bn" }) {
  const byDate = new Map(stats.days.map((d) => [d.date, d]));
  const dots: { date: string; pages: number }[] = [];
  const now = new Date();
  for (let i = STREAK_STRIP_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    dots.push({ date: key, pages: byDate.get(key)?.pages ?? 0 });
  }

  const maxPages = Math.max(1, ...dots.map((d) => d.pages));

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 thumbnail-scroll">
      {dots.map((dot) => {
        const active = dot.pages > 0;
        const intensity = active ? 0.35 + 0.65 * (dot.pages / maxPages) : 0;
        return (
          <div
            key={dot.date}
            title={`${formatDate(`${dot.date}T12:00:00`, lang, {
              month: "short",
              day: "numeric",
            })} — ${lang === "bn" ? toBanglaDigits(dot.pages) : dot.pages} ${t(lang, "pages", "পৃষ্ঠা")}`}
            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-md flex items-center justify-center text-[10px] tabular-nums transition-transform hover:scale-110"
            style={
              active
                ? { backgroundColor: `rgba(211, 84, 0, ${intensity})`, color: "#fff" }
                : { backgroundColor: "rgba(128, 128, 128, 0.12)", color: "rgba(128,128,128,0.5)" }
            }
          >
            {dot.pages > 0 ? (lang === "bn" ? toBanglaDigits(dot.pages) : dot.pages) : ""}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ lang }: { lang: string }) {
  return (
    <div className="border border-border/60 rounded-xl p-12 text-center">
      <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
      <h2 className="text-lg font-medium text-foreground mb-2">
        {t(lang, "No reading data yet", "এখনো কোনো পড়ার তথ্য নেই")}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {t(
          lang,
          "Open a book and start reading — your streaks, pages, and reading time will appear here.",
          "একটি বই খুলে পড়া শুরু করুন — আপনার ধারা, পৃষ্ঠা এবং পড়ার সময় এখানে দেখা যাবে।",
        )}
      </p>
      <BrandCtaButton asChild className="mt-6 px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
        <Link to="/books">
          <BookOpen className="h-3.5 w-3.5" />
          {t(lang, "Browse books", "বই দেখুন")}
        </Link>
      </BrandCtaButton>
    </div>
  );
}
