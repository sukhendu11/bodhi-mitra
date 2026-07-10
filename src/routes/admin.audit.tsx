import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { getAuditLog, type AuditLogRow } from "@/lib/admin.functions";
import { Activity, Shield, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { ErrorPage } from "@/components/error-page";

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
  const { data: log, isLoading, error } = useQuery<AuditLogRow[]>({
    queryKey: ["audit-log"],
    queryFn: () => getAuditLog() as Promise<AuditLogRow[]>,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const [filterAction, setFilterAction] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const actionTypes = useMemo(
    () => [...new Set((log ?? []).map((e: AuditLogRow) => e.action))],
    [log],
  );

  const filtered = useMemo(
    () =>
      (log ?? []).filter((e: AuditLogRow) =>
        filterAction ? e.action === filterAction : true,
      ),
    [log, filterAction],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-secondary/60 animate-pulse rounded-lg" />
        <div className="h-4 w-48 bg-secondary/40 animate-pulse rounded" />
        <div className="space-y-2 mt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <Shield className="h-8 w-8 mx-auto text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">Failed to load audit log: {error.message}</p>
      </div>
    );
  }

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

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterAction("")}
          className={`px-3 py-1.5 text-[0.6rem] font-medium rounded-lg border transition-colors ${
            !filterAction
              ? "bg-foreground/5 text-foreground border-foreground/20"
              : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
          }`}
        >
          All
        </button>
        {actionTypes.map((action) => (
          <button
            key={action}
            onClick={() => setFilterAction(action)}
            className={`px-3 py-1.5 text-[0.6rem] font-medium rounded-lg border transition-colors ${
              filterAction === action
                ? "bg-foreground/5 text-foreground border-foreground/20"
                : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
            }`}
          >
            {ACTION_LABELS[action] || action}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No audit events found.</p>
          </div>
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden transition-all"
            >
              {/* Event row */}
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Action badge */}
                  <span
                    className={`text-[0.55rem] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                      ACTION_STYLES[event.action] || "bg-neutral-100 text-neutral-700 border-neutral-300/50"
                    }`}
                  >
                    {ACTION_LABELS[event.action] || event.action}
                  </span>

                  {/* Actor */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {event.actor_display_name || event.actor_email || "Unknown"}
                    </p>
                  </div>

                  {/* Target */}
                  {event.target_display_name || event.target_email ? (
                    <>
                      <span className="text-muted-foreground/40 text-xs shrink-0">→</span>
                      <div className="min-w-0">
                        <p className="text-sm truncate leading-tight text-muted-foreground">
                          {event.target_display_name || event.target_email}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Time + expand */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    <span title={formatDate(event.created_at)}>{timeAgo(event.created_at)}</span>
                  </div>
                  {event.details && Object.keys(event.details).length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      {expandedId === event.id ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === event.id && event.details && Object.keys(event.details).length > 0 && (
                <div className="border-t border-border/40 bg-secondary/20 px-5 py-3">
                  <pre className="text-[0.6rem] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
