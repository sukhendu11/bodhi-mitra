import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getUserRoles, setUserRoleFn, type UserRoleRow, type SetRoleResult } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuthSession, isHardcodedAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

const ALL_ROLES = [
  { value: "user", label: "User", level: 10 },
  { value: "moderator", label: "Moderator", level: 30 },
  { value: "author", label: "Author", level: 40 },
  { value: "editor", label: "Editor", level: 60 },
  { value: "admin", label: "Admin", level: 80 },
  { value: "super_admin", label: "Super Admin", level: 100 },
];

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 bg-secondary/60 animate-pulse" />
        <div className="h-6 w-64 bg-secondary/40 animate-pulse" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-secondary/30 animate-pulse rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load users: {error.message}</p>;
  }

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

  const roleBadge = (role: string | null) => {
    if (!role) return <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 italic">None</span>;
    const r = ALL_ROLES.find((rr) => rr.value === role);
    const colors: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300/50",
      admin: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/50",
      editor: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300/50",
      author: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-300/50",
      moderator: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-300/50",
      user: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300/50",
    };
    return (
      <span className={`text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border rounded-full ${colors[role] || colors.user}`}>
        {r?.label || role}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-2xl">Users & Roles</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isSuperAdmin ? "You can assign any role to any user." : "You can assign roles below your own level."}
        </p>
      </div>

      <div className="border border-border rounded-sm overflow-hidden">
        <div className="grid grid-cols-[1fr,auto,auto] gap-4 px-5 py-3 bg-secondary/30 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>User</span>
          <span className="w-28 text-center">Role</span>
          <span className="w-24 text-right">Actions</span>
        </div>

        <div className="divide-y divide-border">
          {(users ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          ) : (
            (users ?? []).map((u) => (
              <div key={u.user_id} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {(u.display_name || u.email || "?")[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="w-28 flex justify-center">
                  {editingUser === u.user_id ? (
                    <select
                      value={pendingRole}
                      onChange={(e) => setPendingRole(e.target.value)}
                      className="w-full text-xs border border-border bg-background px-2 py-1.5 rounded-sm focus:outline-none focus:border-foreground/60"
                      autoFocus
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    roleBadge(u.role)
                  )}
                </div>

                <div className="w-24 flex justify-end gap-2">
                  {editingUser === u.user_id ? (
                    <>
                      <button
                        onClick={handleSaveRole}
                        disabled={setRole.isPending}
                        className="text-[10px] uppercase tracking-[0.15em] px-2.5 py-1 bg-foreground text-background hover:opacity-90 disabled:opacity-40 rounded-sm"
                      >
                        {setRole.isPending ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-[10px] uppercase tracking-[0.15em] px-2.5 py-1 text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(u)}
                      disabled={!isSuperAdmin && currentUserRole === u.role}
                      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
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
    </div>
  );
}
