import { createFileRoute } from "@tanstack/react-router";
import { useList } from "@refinedev/core";
import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Activity, Shield, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { DataTable } from "@/components/admin/data-table";
import { ErrorPage } from "@/components/error-page";

interface AuditEvent {
  id: string;
  action: string;
  actor_id: string;
  target_user_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const ACTION_LABELS: Record<string, string> = {
  role_changed: "Role Changed",
  user_deleted: "User Deleted",
  user_invited: "User Invited",
  bulk_role_changed: "Bulk Role Change",
  bulk_users_deleted: "Bulk Delete",
};

const ACTION_STYLES: Record<string, string> = {
  role_changed: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300/50",
  user_deleted: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-300/50",
  user_invited: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-300/50",
  bulk_role_changed: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300/50",
  bulk_users_deleted: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300/50",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function AdminAuditPage() {
  const { query, result } = useList<AuditEvent>({
    resource: "audit",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const log = result?.data ?? [];
  const isLoading = query?.isLoading ?? false;
  const error = query?.error;

  const [filterAction, setFilterAction] = useState("");

  const actionTypes = useMemo(
    () => [...new Set(log.map((e) => e.action))],
    [log],
  );

  const filtered = useMemo(
    () => log.filter((e) => (filterAction ? e.action === filterAction : true)),
    [log, filterAction],
  );

  const columnHelper = createColumnHelper<AuditEvent>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("action", {
        header: "Action",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span
            className={`text-[0.55rem] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
              ACTION_STYLES[getValue()] || "bg-neutral-100 text-neutral-700 border-neutral-300/50 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {ACTION_LABELS[getValue()] || getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("actor_id", {
        header: "Actor",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-foreground/80 truncate max-w-[160px] block" title={getValue()}>
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("target_user_id", {
        header: "Target",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.target_user_id ? (
              <>
                <span className="text-muted-foreground/40 text-xs">→</span>
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[160px] block" title={row.original.target_user_id}>
                  {row.original.target_user_id}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/50 italic">—</span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Time",
        enableSorting: true,
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground" title={formatDate(getValue())}>
              {timeAgo(getValue())}
            </span>
          </div>
        ),
      }),
    ],
    [],
  );

  /* ── Render Sub-Row for details ────────────────────────────────── */

  const renderSubRow = (event: AuditEvent) => {
    if (!event.details || Object.keys(event.details).length === 0) return null;
    return (
      <pre className="text-[0.6rem] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
        {JSON.stringify(event.details, null, 2)}
      </pre>
    );
  };

  /* ── Error state ───────────────────────────────────────────────── */

  if (error) {
    return (
      <div className="text-center py-16">
        <Shield className="h-8 w-8 mx-auto text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">Failed to load audit log: {error.message}</p>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track role changes, user invitations, and deletions.
            </p>
          </div>
        </div>
      </div>

      {/* Action filter buttons */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1 w-fit flex-wrap">
        <button
          onClick={() => setFilterAction("")}
          className={`px-3 py-1.5 text-[0.6rem] font-medium rounded-md transition-colors ${
            !filterAction
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {actionTypes.map((action) => (
          <button
            key={action}
            onClick={() => setFilterAction(action)}
            className={`px-3 py-1.5 text-[0.6rem] font-medium rounded-md transition-colors ${
              filterAction === action
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {ACTION_LABELS[action] || action}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No audit events found.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search audit events…"
          pageSize={25}
          renderSubRow={renderSubRow}
        />
      )}
    </div>
  );
}
