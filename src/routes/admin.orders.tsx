import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ShoppingCart, TrendingUp, BookOpen, DollarSign, ExternalLink, Search } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorPage } from "@/components/error-page";
import { getOrderStats, fetchOrders, type OrderData } from "@/lib/orders";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Admin Orders Page ──────────────────────────────────────────── */

function AdminOrdersPage() {
  const pageSize = 25;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Fetch orders with server-side pagination + search, joined with books/profiles
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page, search],
    queryFn: () => fetchOrders(page, pageSize, { search: search || undefined }),
    staleTime: 15_000,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Fetch stats via TanStack Query
  const { data: stats } = useQuery({
    queryKey: ["order-stats"],
    queryFn: getOrderStats,
    staleTime: 30_000,
  });

  /* ── Search handler ────────────────────────────────────────────── */

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  /* ── Column definitions ────────────────────────────────────────── */

  const columnHelper = createColumnHelper<OrderData>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("book_title_en", {
        header: "Book",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0 max-w-[240px]">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-xs truncate">{row.original.book_title_en || "—"}</span>
          </div>
        ),
      }),
      columnHelper.accessor("user_email", {
        header: "Customer",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[180px]">
            <p className="text-xs font-medium truncate">
              {row.original.user_display_name || "—"}
            </p>
            <p className="text-[0.55rem] text-muted-foreground truncate">
              {row.original.user_email || "—"}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("amount_paid", {
        header: "Amount",
        enableSorting: true,
        cell: ({ getValue }) => {
          const amount = getValue();
          return amount === 0 ? (
            <span className="text-green-600 dark:text-green-400 text-xs font-medium">Free</span>
          ) : (
            <span className="text-xs font-medium tabular-nums">{formatCurrency(amount)}</span>
          );
        },
      }),
      columnHelper.accessor("purchase_date", {
        header: "Date",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground" title={getValue()}>
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {row.original.book_slug && (
              <Link
                to="/books/$slug"
                params={{ slug: row.original.book_slug }}
                search={{} as any}
                className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="View book"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ),
      }),
    ],
    [],
  );

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Orders</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              View all book purchases and digital orders.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={ShoppingCart}
            label="Total Orders"
            value={stats.totalOrders}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Revenue"
            value={Number(stats.totalRevenue.toFixed(2))}
            color="green"
          />
          <StatCard icon={BookOpen} label="Free Books" value={stats.freeOrders} color="purple" />
          <StatCard
            icon={DollarSign}
            label="Paid Books"
            value={stats.paidOrders}
            color="amber"
          />
        </div>
      )}

      {/* Search bar */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search orders by book or customer…"
          className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No orders match your search." : "No orders yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={items}
            pageSize={pageSize}
          />

          {/* Server-side pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
                <span className="mx-2 text-border/60">·</span>
                {total} total orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  ← Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 4, totalPages - 7));
                  const pageNum = start + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum + 1)}
                      className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
                        page === pageNum + 1
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}