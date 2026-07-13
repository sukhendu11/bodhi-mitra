import { BarChart3, MessageSquare, Star, ShoppingCart } from "lucide-react";
import ReactECharts from "echarts-for-react";
import type { MonthlyPostCount, TopCommentedPost, TopRatedBook } from "@/lib/admin.functions";

interface AnalyticsOverviewProps {
  totalComments: number;
  totalPurchases: number;
  totalRatings: number;
}

export function AnalyticsOverview({
  totalComments,
  totalPurchases,
  totalRatings,
}: AnalyticsOverviewProps) {
  const items = [
    {
      icon: MessageSquare,
      label: "Comments",
      value: totalComments,
      color: "text-cyan-600 dark:text-cyan-400",
    },
    {
      icon: ShoppingCart,
      label: "Purchases",
      value: totalPurchases,
      color: "text-green-600 dark:text-green-400",
    },
    {
      icon: Star,
      label: "Ratings",
      value: totalRatings,
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <span className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              {item.label}
            </span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{item.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

interface MonthlyChartProps {
  data: MonthlyPostCount[];
}

export function MonthlyPostChart({ data }: MonthlyChartProps) {
  const chartData = data.map((d) => ({
    label: `${d.year}-${String(d.month).padStart(2, "0")}`,
    count: d.count,
  }));

  const option = {
    grid: { top: 8, right: 4, bottom: 28, left: 32 },
    xAxis: {
      type: "category" as const,
      data: chartData.map((d) => d.label),
      axisLabel: { fontSize: 10, rotate: 45 },
      axisLine: { lineStyle: { color: "hsl(var(--border))" } },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      minInterval: 1,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { color: "hsl(var(--border))", type: "dashed" as const } },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "hsl(var(--popover))",
      borderColor: "hsl(var(--border))",
      borderWidth: 1,
      textStyle: { fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}: ${p.value} posts`;
      },
    },
    series: [
      {
        type: "bar" as const,
        data: chartData.map((d) => d.count),
        itemStyle: {
          color: "hsl(var(--foreground))",
          opacity: 0.15,
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: {
          itemStyle: { opacity: 0.35 },
        },
      },
    ],
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
        <h3 className="text-sm font-semibold">Posts per Month</h3>
      </div>
      <ReactECharts option={option} style={{ height: 160 }} notMerge />
    </div>
  );
}

interface TopContentProps {
  commented: TopCommentedPost[];
  books: TopRatedBook[];
}

export function TopContent({ commented, books }: TopContentProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {commented.length > 0 && (
        <div className="border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold">Most Commented</h3>
          </div>
          <div className="space-y-2">
            {commented.map((post) => (
              <div key={post.id} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate min-w-0 text-muted-foreground">
                  {post.title_en || post.title_bn || "Untitled"}
                </span>
                <span className="text-[0.6rem] font-medium tabular-nums text-muted-foreground/60 shrink-0">
                  {post.comment_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {books.length > 0 && (
        <div className="border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold">Top Rated Books</h3>
          </div>
          <div className="space-y-2">
            {books.map((book) => (
              <div key={book.id} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate min-w-0 text-muted-foreground">
                  {book.title_en || book.title_bn}
                </span>
                <span className="text-[0.6rem] font-medium tabular-nums text-muted-foreground/60 shrink-0 flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  {book.avg_rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
