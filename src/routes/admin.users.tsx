import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getUserRoles, setUserRoleFn, type UserRoleRow, type SetRoleResult } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuthSession, isHardcodedAdmin } from "@/hooks/useAuth";
import { Users, Shield, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin", level: 100, color: "purple" },
  { value: "admin", label: "Admin", level: 80, color: "amber" },
  { value: "editor", label: "Editor", level: 60, color: "blue" },
  { value: "author", label: "Author", level: 40, color: "green" },
  { value: "moderator", label: "Moderator", level: 30, color: "cyan" },
  { value: "user", label: "User", level: 10, color: "neutral" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300/50",
  admin: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/50",
  editor: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300/50",
  author: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-300/50",
  moderator: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-300/50",
  user: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300/50",
};

function AdminUsersPage() {
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const doSetRole = useServerFn(setUserRoleFn);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getUserRoles(),
    staleTime: 30_000,
  });

  const setRole = useMutation({
    mutationFn: ({ targetUserId, newRole }: { targetUserId: string; newRole: string }) =>
      (doSetRole as any)({ data: { targetUserId, newRole } }),
    onSuccess: (result: unknown) => {
      const r = result as SetRoleResult;
      if (!r.ok) {
        toast.error(r.error || "Failed to set role");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string>("user");

  const currentUserRole = (users ?? []).find((u) => u.user_id === user?.id)?.role;
  const isSuperAdmin = isHardcodedAdmin(user) || currentUserRole === "super_admin";

  const handleStartEdit = (u: UserRoleRow) => {
    setEditingUser(u.user_id);
    setPendingRole(u.role || "user");
  };

  const handleSaveRole = () => {
    if (!editingUser) return;
    setRole.mutate({ targetUserId: editingUser, newRole: pendingRole });
    setEditingUser(null);
  };

  const RoleBadge = ({ role }: { role: string | null }) => {
    if (!role) return <span className="text-[0.6rem] text-muted-foreground/50 italic">None</span>;
    const r = ALL_ROLES.find((rr) => rr.value === role);
    return (
      <span className={`text-[0.6rem] font-medium px-2.5 py-0.5 rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.user}`}>
        {r?.label || role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-32 bg-secondary/60 animate-pulse rounded-lg" />
          <div className="h-4 w-48 bg-secondary/40 animate-pulse rounded" />
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <Shield className="h-8 w-8 mx-auto text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">Failed to load users: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users & Roles</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isSuperAdmin
              ? "You have full control over all user roles."
              : "You can assign roles below your own level."}
          </p>
        </div>
        <Users className="h-5 w-5 text-muted-foreground/40" />
      </div>

      {/* Users list */}
      <div className="space-y-2">
        {(users ?? []).length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        ) : (
          (users ?? []).map((u) => (
            <div
              key={u.user_id}
              className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 px-5 py-4 hover:border-border transition-colors"
            >
              {/* User info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-border/60 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-foreground/60 to-foreground/30 flex items-center justify-center text-[0.6rem] font-semibold text-background shrink-0">
                    {(u.display_name || u.email || "?")[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                </div>
              </div>

              {/* Role */}
              <div className="w-28 flex justify-center">
                {editingUser === u.user_id ? (
                  <div className="relative">
                    <select
                      value={pendingRole}
                      onChange={(e) => setPendingRole(e.target.value)}
                      className="appearance-none w-full text-xs border border-border/60 bg-background px-3 py-1.5 pr-8 rounded-lg focus:outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 transition-colors"
                      autoFocus
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
                  </div>
                ) : (
                  <RoleBadge role={u.role} />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 w-28 justify-end">
                {editingUser === u.user_id ? (
                  <>
                    <button
                      onClick={handleSaveRole}
                      disabled={setRole.isPending}
                      className="px-3 py-1.5 text-[0.6rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      {setRole.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStartEdit(u)}
                    disabled={!isSuperAdmin && currentUserRole === u.role}
                    className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-lg hover:border-border disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
