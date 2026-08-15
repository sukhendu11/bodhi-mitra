/**
 * Admin dashboard analytics widgets — finefoods-template pattern (charts on
 * the dashboard: content performance + order insights).
 *
 * ECharts (already used by /stats) with an SSR + jsdom guard: charts mount
 * only client-side AND only when a 2d canvas context is actually available
 * (headless jsdom lacks one, so unit tests render the fallback, not a crash).
 */
import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useLang, toBanglaDigits } from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";
import type { AdminDashboardStats, OrderStatusBucket } from "@/lib/admin/dashboard-stats";

const SAFRON = "#d35400";

/** Canvas 2d availability — false in jsdom/SSR, true in real browsers. */
export function canvas2dAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.createElement("canvas").getContext("2d") !== null;
  } catch {
    return false;
  }
}

function useIsDark(): boolean {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const compute = () =>
      setIsDark(
        theme === "dark" ||
          (theme === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches),
      );
    compute();
    if (theme === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", compute);
      return () => mq.removeEventListener("change", compute);
    }
  }, [theme]);
  return isDark;
}

/** Shared axis/legend colors that adapt to the active theme. */
function chartTheme(isDark: boolean) {
  return {
    axis: isDark ? "#a1a1aa" : "#71717a",
    split: isDark ? "#27272a" : "#e4e4e7",
    muted: isDark ? "#52525b" : "#a1a1aa",
    tooltipBg: isDark ? "#18181b" : "#ffffff",
    tooltipText: isDark ? "#fafafa" : "#18181b",
  };
}

function ChartCard({
  title,
  children,
  height,
}: {
  title: string;
  children: React.ReactNode;
  height: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <h3 className="font-serif text-base text-foreground">{title}</h3>
      <div style={{ height }} className="mt-2">
        {children}
      </div>
    </div>
  );
}

/** Grouped horizontal bars: total vs published per content type. */
function ContentOverviewChart({ stats }: { stats: AdminDashboardStats }) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const isDark = useIsDark();
  const t = chartTheme(isDark);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const option = useMemo(() => {
    const types = [
      { key: "books", label: bn ? "বই" : "Books", total: stats.books, published: stats.publishedBooks },
      { key: "posts", label: bn ? "প্রতিফলন" : "Reflections", total: stats.posts, published: stats.publishedPosts },
      { key: "videos", label: bn ? "ভিডিও" : "Videos", total: stats.videos, published: stats.videos },
    ];
    const fmt = (v: number) => (bn ? toBanglaDigits(v) : String(v));
    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        backgroundColor: t.tooltipBg,
        borderColor: t.split,
        textStyle: { color: t.tooltipText, fontSize: 12 },
        formatter: (params: any) => {
          const arr = Array.isArray(params) ? params : [params];
          const label = arr[0]?.axisValue ?? "";
          return arr
            .map((p: any) => `${p.marker}${p.seriesName}: ${fmt(Number(p.value))}`)
            .join("<br/>")
            .replace(arr[0]?.axisValue ?? "", label);
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: t.axis, fontSize: 11 },
        data: [bn ? "মোট" : "Total", bn ? "প্রকাশিত" : "Published"],
      },
      grid: { left: 8, right: 16, top: 12, bottom: 32, containLabel: true },
      xAxis: {
        type: "value" as const,
        axisLabel: { color: t.axis, fontSize: 11 },
        splitLine: { lineStyle: { color: t.split } },
      },
      yAxis: {
        type: "category" as const,
        data: types.map((x) => x.label),
        axisLabel: { color: t.axis, fontSize: 12 },
        axisLine: { lineStyle: { color: t.split } },
        axisTick: { show: false },
      },
      series: [
        {
          name: bn ? "মোট" : "Total",
          type: "bar" as const,
          data: types.map((x) => x.total),
          itemStyle: { color: t.muted, borderRadius: [0, 3, 3, 0] },
          barMaxWidth: 16,
        },
        {
          name: bn ? "প্রকাশিত" : "Published",
          type: "bar" as const,
          data: types.map((x) => x.published),
          itemStyle: { color: SAFRON, borderRadius: [0, 3, 3, 0] },
          barMaxWidth: 16,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, bn, t, isDark]);

  if (!mounted || !canvas2dAvailable()) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        {bn ? "চার্ট লোড হচ্ছে…" : "Loading chart…"}
      </div>
    );
  }
  return (
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
  );
}

/** Donut: orders bucketed by status. */
function OrdersByStatusChart({ buckets }: { buckets: OrderStatusBucket[] }) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const isDark = useIsDark();
  const t = chartTheme(isDark);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const STATUS_COLORS: Record<string, string> = {
    paid: "#16a34a",
    pending: "#d97706",
    failed: "#dc2626",
    cancelled: "#71717a",
    refunded: "#7c3aed",
  };
  const STATUS_LABELS: Record<string, string> = {
    paid: bn ? "পরিশোধিত" : "Paid",
    pending: bn ? "বাকি" : "Pending",
    failed: bn ? "ব্যর্থ" : "Failed",
    cancelled: bn ? "বাতিল" : "Cancelled",
    refunded: bn ? "ফেরত" : "Refunded",
  };

  const option = useMemo(() => {
    const data = buckets.map((b) => ({
      name: STATUS_LABELS[b.status] ?? b.status,
      value: b.count,
      itemStyle: { color: STATUS_COLORS[b.status] ?? t.muted },
    }));
    return {
      tooltip: {
        trigger: "item" as const,
        backgroundColor: t.tooltipBg,
        borderColor: t.split,
        textStyle: { color: t.tooltipText, fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: t.axis, fontSize: 11 },
      },
      series: [
        {
          name: bn ? "অর্ডার" : "Orders",
          type: "pie" as const,
          radius: ["55%", "78%"],
          center: ["50%", "42%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: isDark ? "#18181b" : "#ffffff", borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" as const, color: t.tooltipText } },
          data,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, bn, t, isDark]);

  if (!mounted || !canvas2dAvailable()) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        {bn ? "চার্ট লোড হচ্ছে…" : "Loading chart…"}
      </div>
    );
  }
  return (
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
  );
}

export function DashboardCharts({ stats }: { stats: AdminDashboardStats }) {
  const { lang } = useLang();
  const bn = lang === "bn";
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard title={bn ? "কন্টেন্ট ওভারভিউ" : "Content overview"} height={230}>
        <ContentOverviewChart stats={stats} />
      </ChartCard>
      <ChartCard title={bn ? "অর্ডার (অবস্থা অনুযায়ী)" : "Orders by status"} height={230}>
        <OrdersByStatusChart buckets={stats.ordersByStatus} />
      </ChartCard>
    </div>
  );
}
