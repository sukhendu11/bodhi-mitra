import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  getUserRoles,
  setUserRoleFn,
  inviteUserFn,
  deleteUserFn,
  bulkDeleteUsersFn,
  bulkSetRoleFn,
  type UserRoleRow,
  type SetRoleResult,
  type DeleteUserResult,
  type BulkActionResult,
} from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuthSession, isHardcodedAdmin } from "@/hooks/useAuth";
import {
  Users,
  Shield,
  Mail,
  Check,
  UserPlus,
  X,
  CheckCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin", level: 100, desc: "Full system access" },
  { value: "admin", label: "Admin", level: 80, desc: "Manage content & settings" },
  { value: "editor", label: "Editor", level: 60, desc: "Publish & edit any post" },
  { value: "author", label: "Author", level: 40, desc: "Create & edit own posts" },
  { value: "moderator", label: "Moderator", level: 30, desc: "Moderate comments" },
  { value: "user", label: "User", level: 10, desc: "Read & comment" },
] as const;

const ROLE_STYLES: Record<string, { bg: string; ring: string; text: string }> = {
  super_admin: { bg: "bg-purple-50 dark:bg-purple-950/30", ring: "ring-purple-400 dark:ring-purple-600", text: "text-purple-700 dark:text-purple-300" },
  admin:   { bg: "bg-amber-50 dark:bg-amber-950/30", ring: "ring-amber-400 dark:ring-amber-600", text: "text-amber-700 dark:text-amber-300" },
  editor:  { bg: "bg-blue-50 dark:bg-blue-950/30", ring: "ring-blue-400 dark:ring-blue-600", text: "text-blue-700 dark:text-blue-300" },
  author:  { bg: "bg-green-50 dark:bg-green-950/30", ring: "ring-green-400 dark:ring-green-600", text: "text-green-700 dark:text-green-300" },
  moderator: { bg: "bg-cyan-50 dark:bg-cyan-950/30", ring: "ring-cyan-400 dark:ring-cyan-600", text: "text-cyan-700 dark:text-cyan-300" },
  user:    { bg: "bg-neutral-50 dark:bg-neutral-800/50", ring: "ring-neutral-400 dark:ring-neutral-600", text: "text-neutral-700 dark:text-neutral-300" },
};

const ROLE_BADGE: Record<string, string> = {
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
  const doInvite = useServerFn(inviteUserFn);
  const doDelete = useServerFn(deleteUserFn);
  const doBulkDelete = useServerFn(bulkDeleteUsersFn);
  const doBulkSetRole = useServerFn(bulkSetRoleFn);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getUserRoles(),
    staleTime: 30_000,
  });

  /* ── Single role mutation ─────────────────────────────────────── */

  const setRole = useMutation({
    mutationFn: ({ targetUserId, newRole }: { targetUserId: string; newRole: string }) =>
      (doSetRole as any)({ data: { targetUserId, newRole } }),
    onSuccess: (result: unknown) => {
      const r = result as SetRoleResult;
      if (!r.ok) { toast.error(r.error || "Failed to set role"); return; }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ── Invite mutation ──────────────────────────────────────────── */

  const invite = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      (doInvite as any)({ data: { email, role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setInviteEmail("");
      setInviteRole("user");
      setShowInvite(false);
      toast.success("Invitation email sent — user added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ── Single delete mutation ───────────────────────────────────── */

  const deleteUser = useMutation({
    mutationFn: ({ targetUserId }: { targetUserId: string }) =>
      (doDelete as any)({ data: { targetUserId } }),
    onSuccess: (result: unknown) => {
      const r = result as DeleteUserResult;
      if (!r.ok) { toast.error(r.error || "Failed to delete user"); return; }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      setDeletingUser(null);
      toast.success("User deleted");
    },
    onError: (e: Error) => {
      setDeletingUser(null);
      toast.error(e.message);
    },
  });

  /* ── Bulk delete mutation ─────────────────────────────────────── */

  const bulkDelete = useMutation({
    mutationFn: ({ targetUserIds }: { targetUserIds: string[] }) =>
      (doBulkDelete as any)({ data: { targetUserIds } }),
    onSuccess: (result: unknown) => {
      const r = result as BulkActionResult;
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      setBulkDeleteOpen(false);
      setSelectedUsers(new Set());
      setBulkRoleSelected("");
      setShowBulkRolePicker(false);
      if (r.succeeded > 0) {
        toast.success(`${r.succeeded} user${r.succeeded > 1 ? "s" : ""} deleted`);
      }
      if (r.failed > 0) {
        toast.error(`${r.failed} deletion${r.failed > 1 ? "s" : ""} failed`);
        r.errors.forEach((e) => toast.error(e.error, { description: e.userId }));
      }
      if (r.succeeded === 0 && r.failed > 0) {
        toast.error("No users could be deleted");
      }
    },
    onError: (e: Error) => {
      setBulkDeleteOpen(false);
      toast.error(e.message);
    },
  });

  /* ── Bulk set-role mutation ───────────────────────────────────── */

  const bulkSetRole = useMutation({
    mutationFn: ({ targetUserIds, newRole }: { targetUserIds: string[]; newRole: string }) =>
      (doBulkSetRole as any)({ data: { targetUserIds, newRole } }),
    onSuccess: (result: unknown) => {
      const r = result as BulkActionResult;
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      setBulkRoleSelected("");
      setShowBulkRolePicker(false);
      setSelectedUsers(new Set());
      if (r.succeeded > 0) {
        toast.success(`Role updated for ${r.succeeded} user${r.succeeded > 1 ? "s" : ""}`);
      }
      if (r.failed > 0) {
        toast.error(`${r.failed} update${r.failed > 1 ? "s" : ""} failed`);
        r.errors.forEach((e) => toast.error(e.error, { description: e.userId }));
      }
      if (r.succeeded === 0 && r.failed > 0) {
        toast.error("No roles could be updated");
      }
    },
    onError: (e: Error) => {
      setBulkRoleSelected("");
      setShowBulkRolePicker(false);
      toast.error(e.message);
    },
  });

  /* ── Local state ──────────────────────────────────────────────── */

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string>("user");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [showBulkRolePicker, setShowBulkRolePicker] = useState(false);
  const [bulkRoleSelected, setBulkRoleSelected] = useState("");

  /* ── Derived ──────────────────────────────────────────────────── */

  const currentUserRole = (users ?? []).find((u) => u.user_id === user?.id)?.role;
  const isSuperAdmin = isHardcodedAdmin(user) || currentUserRole === "super_admin";
  const isOnlySuperAdmin = isSuperAdmin && (users ?? []).filter((u) => u.role === "super_admin").length <= 1;
  const selectedCount = selectedUsers.size;

  // Determine which user IDs are selectable (not yourself, not last super_admin for non-super_admin users)
  const selectableUserIds = useMemo(() => {
    return (users ?? [])
      .filter((u) => {
        if (u.user_id === user?.id) return false;
        if (u.role === "super_admin" && isOnlySuperAdmin) return false;
        return true;
      })
      .map((u) => u.user_id);
  }, [users, user?.id, isOnlySuperAdmin]);

  const allVisibleSelected = useMemo(
    () => selectableUserIds.length > 0 && selectableUserIds.every((id) => selectedUsers.has(id)),
    [selectableUserIds, selectedUsers],
  );

  const handleStartEdit = (u: UserRoleRow) => {
    setEditingUser(u.user_id);
    setPendingRole(u.role || "user");
  };

  const handleSaveRole = () => {
    if (!editingUser) return;
    const originalRole = (users ?? []).find((u) => u.user_id === editingUser)?.role || "user";
    if (pendingRole === originalRole) { setEditingUser(null); return; }
    setRole.mutate({ targetUserId: editingUser, newRole: pendingRole });
    setEditingUser(null);
  };

  const toggleSelect = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(selectableUserIds));
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
    setShowBulkRolePicker(false);
    setBulkRoleSelected("");
  };

  /* ── Role badge component ─────────────────────────────────────── */

  const RoleBadge = ({ role }: { role: string | null }) => {
    if (!role) return <span className="text-[0.6rem] text-muted-foreground/50 italic">None</span>;
    const r = ALL_ROLES.find((rr) => rr.value === role);
    return (
      <span className={`text-[0.55rem] font-medium px-2 py-0.5 rounded-full border ${ROLE_BADGE[role] || ROLE_BADGE.user}`}>
        {r?.label || role}
      </span>
    );
  };

  /* ── Visual role radio selector ───────────────────────────────── */

  const RoleSelector = ({
    selected,
    onChange,
    compact,
  }: {
    selected: string;
    onChange: (v: string) => void;
    compact?: boolean;
  }) => (
    <div className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-2 sm:grid-cols-3 gap-2"}>
      {ALL_ROLES.map((r) => {
        const isSelected = selected === r.value;
        const style = ROLE_STYLES[r.value];
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(r.value)}
            className={`relative text-left transition-all ${
              compact
                ? `px-2.5 py-1.5 rounded-lg text-[0.55rem] font-medium border ${
                    isSelected
                      ? `${style.bg} ${style.text} border-current ring-1 ${style.ring}`
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`
                : `px-3 py-2.5 rounded-xl text-sm border ${
                    isSelected
                      ? `${style.bg} ${style.text} border-current ring-2 ${style.ring}`
                      : "border-border/60 text-muted-foreground hover:border-border hover:bg-secondary/30"
                  }`
            }`}
          >
            {isSelected && (
              <span className={`absolute ${compact ? "hidden" : "top-1.5 right-1.5"}`}>
                <Check className={`h-3 w-3 ${style.text}`} />
              </span>
            )}
            <div className={compact ? "" : "font-medium text-xs mb-0.5"}>{r.label}</div>
            {!compact && <div className="text-[0.6rem] opacity-70">{r.desc}</div>}
          </button>
        );
      })}
    </div>
  );

  /* ── Loading state ────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-secondary/60 animate-pulse rounded-lg" />
        <div className="h-4 w-48 bg-secondary/40 animate-pulse rounded" />
        <div className="grid gap-3 mt-6">
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

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Users & Roles</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuperAdmin
                ? "Manage all users and their permissions."
                : "You can assign roles below your own level."}
            </p>
          </div>
        </div>
      </div>

      {/* Invite user card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        {showInvite ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground/60" />
                <h3 className="text-sm font-medium">Invite a new user</h3>
              </div>
              <button
                onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email input */}
              <div>
                <label className="block text-[0.6rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-[0.6rem] font-medium text-muted-foreground mb-2 uppercase tracking-[0.05em]">
                  Assign role
                </label>
                <RoleSelector selected={inviteRole} onChange={setInviteRole} />
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!inviteEmail.trim()) { toast.error("Enter an email address"); return; }
                    invite.mutate({ email: inviteEmail.trim(), role: inviteRole });
                  }}
                  disabled={invite.isPending || !inviteEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {invite.isPending ? (
                    <>Sending…</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5" /> Send Invitation</>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">Invite a new user by email</span>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <UserPlus className="h-3 w-3" /> Invite
            </button>
          </div>
        )}
      </div>

      {/* ── Bulk actions toolbar ──────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="sticky top-20 z-10 -mx-1 px-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/80 shadow-md px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedCount} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-[0.6rem] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk role change */}
              <button
                onClick={() => setShowBulkRolePicker(!showBulkRolePicker)}
                disabled={bulkSetRole.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium border border-border/60 rounded-lg hover:bg-secondary/60 hover:border-border disabled:opacity-40 transition-colors"
              >
                <CheckCircle className="h-3 w-3" />
                Change Role
                <ChevronDown className={`h-3 w-3 transition-transform ${showBulkRolePicker ? "rotate-180" : ""}`} />
              </button>

              {/* Bulk delete */}
              <button
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkDelete.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium text-destructive/80 hover:text-destructive border border-destructive/20 rounded-lg hover:border-destructive/40 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>

          {/* Inline bulk role picker */}
          {showBulkRolePicker && (
            <div className="bg-white dark:bg-zinc-900 border-x border-b border-border/60 rounded-b-xl px-5 py-4 space-y-3">
              <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-[0.05em]">
                Assign role to {selectedCount} user{selectedCount > 1 ? "s" : ""}
              </p>
              <RoleSelector selected={bulkRoleSelected} onChange={setBulkRoleSelected} />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => { setShowBulkRolePicker(false); setBulkRoleSelected(""); }}
                  className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!bulkRoleSelected) { toast.error("Select a role"); return; }
                    bulkSetRole.mutate({
                      targetUserIds: Array.from(selectedUsers),
                      newRole: bulkRoleSelected,
                    });
                  }}
                  disabled={bulkSetRole.isPending || !bulkRoleSelected}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[0.6rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {bulkSetRole.isPending
                    ? "Updating…"
                    : <><CheckCircle className="h-3 w-3" /> Apply Role</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users list */}
      <div className="space-y-2">
        {(users ?? []).length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        ) : (
          <>
            {/* Select-all header */}
            <div className="flex items-center px-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  disabled={selectableUserIds.length === 0}
                  className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30 disabled:opacity-30"
                />
                <span className="text-[0.55rem] font-medium text-muted-foreground/60 uppercase tracking-[0.1em]">
                  {allVisibleSelected ? "Deselect all" : "Select all"} ({selectableUserIds.length} selectable)
                </span>
              </label>
            </div>

            {(users ?? []).map((u) => {
              const isSelectable = selectableUserIds.includes(u.user_id);
              const isSelected = selectedUsers.has(u.user_id);

              return (
                <div
                  key={u.user_id}
                  className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden transition-all ${
                    isSelected
                      ? "border-foreground/30 ring-1 ring-foreground/10 shadow-sm"
                      : "border-border/60"
                  }`}
                >
                  {/* User row (collapsed) */}
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    {/* Checkbox + info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(u.user_id)}
                        disabled={!isSelectable || editingUser === u.user_id}
                        className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30 disabled:opacity-30 shrink-0"
                      />

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

                    {/* Role badge */}
                    <div className="shrink-0">
                      {editingUser === u.user_id ? null : <RoleBadge role={u.role} />}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      {editingUser === u.user_id ? null : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(u)}
                            disabled={!isSuperAdmin && currentUserRole === u.role}
                            className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-lg hover:border-border disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingUser(u.user_id)}
                            disabled={
                              u.user_id === user?.id ||
                              (u.role === "super_admin" && isOnlySuperAdmin) ||
                              !isSuperAdmin
                            }
                            title={
                              u.user_id === user?.id
                                ? "Cannot delete yourself"
                                : u.role === "super_admin" && isOnlySuperAdmin
                                  ? "Cannot delete the last super_admin"
                                  : "Delete user"
                            }
                            className="px-2 py-1.5 text-[0.6rem] font-medium text-destructive/70 hover:text-destructive border border-destructive/20 rounded-lg hover:border-destructive/40 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded role editor */}
                  {editingUser === u.user_id && (
                    <div className="border-t border-border/40 bg-secondary/20 px-5 py-4 space-y-3">
                      <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-[0.05em]">
                        Select role for <span className="text-foreground">{u.display_name || u.email}</span>
                      </p>
                      <RoleSelector selected={pendingRole} onChange={setPendingRole} />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveRole}
                          disabled={setRole.isPending}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[0.6rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                          {setRole.isPending ? "Saving…" : <><CheckCircle className="h-3 w-3" /> Save Role</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Single delete confirmation dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => { if (!open) setDeletingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const target = (users ?? []).find((u) => u.user_id === deletingUser);
                return (
                  <>
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-foreground">
                      {target?.display_name || target?.email || "this user"}
                    </span>
                    ? This action cannot be undone. The user will be permanently removed from the system, including all their data.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deletingUser) deleteUser.mutate({ targetUserId: deletingUser });
              }}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => { if (!open) setBulkDeleteOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} user{selectedCount > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{selectedCount}</span> selected user
              {selectedCount > 1 ? "s" : ""}? This action cannot be undone. All selected users will be permanently
              removed from the system, including all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedCount > 0) {
                  bulkDelete.mutate({ targetUserIds: Array.from(selectedUsers) });
                }
              }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending
                ? "Deleting…"
                : `Delete ${selectedCount} user${selectedCount > 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
