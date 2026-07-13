import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  getAllLoginHistory,
  getActiveSessions,
  revokeSessionFn,
  revokeAllUserSessionsFn,
  type LoginEvent,
  type ActiveSession,
} from "@/lib/admin.functions";
import {
  Shield,
  History,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  LogOut,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";
import { ErrorPage } from "@/components/error-page";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/security" as any)({
  component: AdminSecurityPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function AdminSecurityPage() {
  const queryClient = useQueryClient();
  const doGetLoginHistory = useServerFn(getAllLoginHistory);
  const doGetSessions = useServerFn(getActiveSessions);
  const doRevokeSession = useServerFn(revokeSessionFn);
  const doRevokeAll = useServerFn(revokeAllUserSessionsFn);

  const [activeTab, setActiveTab] = useState<"history" | "sessions">("history");
  const [confirmRevokeAll, setConfirmRevokeAll] = useState<string | null>(null);

  const { data: loginHistory, isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: ["login-history"],
    queryFn: () => doGetLoginHistory(),
    staleTime: 30_000,
  });

  const { data: sessions, isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: () => doGetSessions(),
    staleTime: 15_000,
    retry: 1,
  });

  const revokeSession = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) =>
      (doRevokeSession as any)({ data: { sessionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      toast.success("Session revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAll = useMutation({
    mutationFn: ({ targetUserId }: { targetUserId: string }) =>
      (doRevokeAll as any)({ data: { targetUserId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      setConfirmRevokeAll(null);
      toast.success("All sessions revoked for user");
    },
    onError: (e: Error) => {
      setConfirmRevokeAll(null);
      toast.error(e.message);
    },
  });

  // Group sessions by user
  const sessionsByUser = useMemo(() => {
    if (!sessions) return [];
    const userMap = new Map<string, ActiveSession[]>();
    for (const s of sessions) {
      const existing = userMap.get(s.user_id) ?? [];
      existing.push(s);
      userMap.set(s.user_id, existing);
    }
    return Array.from(userMap.entries()).sort(
      (a, b) => b[1].length - a[1].length,
    );
  }, [sessions]);

  // Derived stats
  const totalSessions = sessions?.length ?? 0;
  const uniqueUsers = sessionsByUser.length;
  const historyCount = loginHistory?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Security</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monitor login activity and manage active sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Logins",
            value: historyCount,
            icon: <History className="h-3.5 w-3.5" />,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Active Sessions",
            value: totalSessions,
            icon: <Monitor className="h-3.5 w-3.5" />,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Users with Sessions",
            value: uniqueUsers,
            icon: <Globe className="h-3.5 w-3.5" />,
            color: "text-purple-600 dark:text-purple-400",
          },
          {
            label: "Session / User Avg",
            value: uniqueUsers > 0 ? (totalSessions / uniqueUsers).toFixed(1) : "0",
            icon: <Smartphone className="h-3.5 w-3.5" />,
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className={`${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-lg font-semibold leading-tight">{stat.value}</p>
                <p className="text-[0.55rem] text-muted-foreground uppercase tracking-[0.05em]">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "history" | "sessions")}
      >
        <TabsList className="bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1 h-auto">
          <TabsTrigger
            value="history"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.55rem] font-medium rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
          >
            <History className="h-3 w-3" />
            Login History
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.55rem] font-medium rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
          >
            <Monitor className="h-3 w-3" />
            Active Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-2">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
            {historyLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : historyError ? (
              <div className="p-6 text-center">
                <p className="text-sm text-destructive">{historyError.message}</p>
              </div>
            ) : !loginHistory || loginHistory.length === 0 ? (
              <div className="p-12 text-center">
                <History className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No login history recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {loginHistory.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-secondary/40 flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">
                            {event.email || "Unknown user"}
                          </span>
                          <span className="text-[0.5rem] px-1.5 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-secondary/30">
                            {event.sign_in_method || "email"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[0.5rem] text-muted-foreground mt-0.5">
                          {event.ip_address && (
                            <>
                              <span>{event.ip_address}</span>
                              <span>·</span>
                            </>
                          )}
                          <span className="font-mono truncate max-w-[160px]">
                            {event.user_agent ? event.user_agent.slice(0, 60) + "..." : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground/40" />
                      <span
                        className="text-[0.55rem] text-muted-foreground whitespace-nowrap"
                        title={formatDateTime(event.created_at)}
                      >
                        {timeAgo(event.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-2">
          <div className="space-y-4">
            {sessionsLoading ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : sessionsError ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-12 text-center">
                <Shield className="h-8 w-8 mx-auto text-destructive/50 mb-3" />
                <p className="text-sm text-destructive mb-2">
                  Failed to load sessions
                </p>
                <p className="text-[0.55rem] text-muted-foreground">
                  {sessionsError.message}
                </p>
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-12 text-center">
                <Monitor className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No active sessions found.
                </p>
              </div>
            ) : (
              sessionsByUser.map(([userId, userSessions]) => {
                const user = userSessions[0];
                const displayName = user.user_name || user.user_email || userId.slice(0, 8);
                return (
                  <div
                    key={userId}
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-secondary/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-[0.5rem] font-semibold text-foreground">
                          {displayName[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{displayName}</p>
                          <p className="text-[0.5rem] text-muted-foreground">
                            {userSessions.length} session{userSessions.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRevokeAll(userId)}
                        disabled={revokeAll.isPending}
                        className="text-[0.5rem] font-medium text-destructive/70 hover:text-destructive border-destructive/20 hover:border-destructive/40"
                      >
                        <LogOut className="h-3 w-3" />
                        Revoke All
                      </Button>
                    </div>

                    <div className="divide-y divide-border/20">
                      {userSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-secondary/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Smartphone className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[0.55rem] font-mono text-muted-foreground truncate">
                                  {session.id.slice(0, 16)}…
                                </span>
                                {session.aal && (
                                  <span className="text-[0.45rem] px-1 py-0.5 rounded border border-border/40 text-muted-foreground bg-secondary/20">
                                    AAL {session.aal}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[0.5rem] text-muted-foreground mt-0.5">
                                <span>Created {timeAgo(session.created_at)}</span>
                                {session.not_after && (
                                  <>
                                    <span>·</span>
                                    <span>Expires {timeAgo(session.not_after)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revokeSession.mutate({ sessionId: session.id })}
                            disabled={revokeSession.isPending}
                            className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                            title="Revoke this session"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Revoke all confirmation */}
      {confirmRevokeAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-96 mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive/70" />
              <h3 className="text-sm font-medium">Revoke all sessions?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will sign out this user from all devices. They will need to log in again.
              The access token they currently hold will remain valid until it expires
              (typically 1 hour), but they won't be able to refresh it.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRevokeAll(null)}
                className="text-[0.55rem] font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => revokeAll.mutate({ targetUserId: confirmRevokeAll })}
                disabled={revokeAll.isPending}
                className="text-[0.55rem] font-medium"
              >
                {revokeAll.isPending ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Revoking…
                  </>
                ) : (
                  <>
                    <LogOut className="h-3 w-3" />
                    Revoke All Sessions
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
