import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  getPermissions,
  createPermissionFn,
  updatePermissionFn,
  deletePermissionFn,
  KNOWN_RESOURCES,
  KNOWN_ACTIONS,
  type PermissionRow,
} from "@/lib/admin.functions";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Plus,
  X,
  Trash2,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { ErrorPage } from "@/components/error-page";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/permissions" as any)({
  component: AdminPermissionsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const ALL_ROLES = ["super_admin", "admin", "editor", "author", "moderator", "user"];

const ROLE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  super_admin: { bg: "bg-purple-100 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", ring: "ring-purple-400" },
  admin: { bg: "bg-amber-100 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-400" },
  editor: { bg: "bg-blue-100 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", ring: "ring-blue-400" },
  author: { bg: "bg-green-100 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300", ring: "ring-green-400" },
  moderator: { bg: "bg-cyan-100 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", ring: "ring-cyan-400" },
  user: { bg: "bg-neutral-100 dark:bg-neutral-800", text: "text-neutral-700 dark:text-neutral-300", ring: "ring-neutral-400" },
};

function AdminPermissionsPage() {
  const queryClient = useQueryClient();
  const doGetPermissions = useServerFn(getPermissions);
  const doCreate = useServerFn(createPermissionFn);
  const doUpdate = useServerFn(updatePermissionFn);
  const doDelete = useServerFn(deletePermissionFn);

  const { data: permissions, isLoading: permLoading, error: permError } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => doGetPermissions(),
    staleTime: 30_000,
  });

  const createPerm = useMutation({
    mutationFn: (input: { role: string; resource: string; action: string; allowed: boolean }) =>
      (doCreate as any)({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setShowAddForm(false);
      setNewRole("admin");
      setNewResource("posts");
      setNewAction("create");
      toast.success("Permission added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePerm = useMutation({
    mutationFn: ({ id, allowed }: { id: string; allowed: boolean }) =>
      (doUpdate as any)({ data: { id, allowed } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePerm = useMutation({
    mutationFn: ({ id }: { id: string }) => (doDelete as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setDeletingId(null);
      toast.success("Permission removed");
    },
    onError: (e: Error) => {
      setDeletingId(null);
      toast.error(e.message);
    },
  });

  // Local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole] = useState("admin");
  const [newResource, setNewResource] = useState("posts");
  const [newAction, setNewAction] = useState("create");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [showRowLabels, setShowRowLabels] = useState(true);

  // Build permission lookup: `role:resource:action` → PermissionRow
  const permMap = useMemo(() => {
    const map = new Map<string, PermissionRow>();
    for (const p of permissions ?? []) {
      map.set(`${p.role}:${p.resource}:${p.action}`, p);
    }
    return map;
  }, [permissions]);

  // Determine which resources/actions have at least one permission defined
  const allCombos = useMemo(() => {
    const combos: { resource: string; action: string }[] = [];
    for (const resource of KNOWN_RESOURCES) {
      for (const action of KNOWN_ACTIONS) {
        // Only show combos that have at least one permission row OR are in the filtered scope
        const hasAny = ALL_ROLES.some((role) => permMap.has(`${role}:${resource}:${action}`));
        if (hasAny || resource === filterResource || !filterResource) {
          combos.push({ resource, action });
        }
      }
    }
    // Always include combos from existing permissions
    const existingKeys = new Set(combos.map((c) => `${c.resource}:${c.action}`));
    for (const p of permissions ?? []) {
      const key = `${p.resource}:${p.action}`;
      if (!existingKeys.has(key)) {
        combos.push({ resource: p.resource, action: p.action });
        existingKeys.add(key);
      }
    }
    return combos;
  }, [permissions, filterResource]);

  // Filter displayed combos
  const displayedCombos = useMemo(() => {
    return allCombos.filter((c) => {
      if (filterResource && c.resource !== filterResource) return false;
      return true;
    });
  }, [allCombos, filterResource]);

  const resourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of permissions ?? []) {
      counts[p.resource] = (counts[p.resource] || 0) + 1;
    }
    return counts;
  }, [permissions]);

  // Extract unique resources from permissions
  const existingResources = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions ?? []) set.add(p.resource);
    for (const r of KNOWN_RESOURCES) set.add(r);
    return Array.from(set).sort();
  }, [permissions]);

  const resourceLabels: Record<string, string> = {
    posts: "Posts",
    comments: "Comments",
    media: "Media",
    users: "Users",
    settings: "Settings",
    pages: "Pages",
    books: "Books",
    videos: "Videos",
  };

  const actionLabels: Record<string, string> = {
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    publish: "Publish",
    view_all: "View All",
    moderate: "Moderate",
    upload: "Upload",
    manage_roles: "Manage Roles",
    view: "View",
  };

  /* ── Loading state ──────────────────────────────────────────── */

  if (permLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (permError) {
    return (
      <div className="text-center py-16">
        <ShieldX className="h-8 w-8 mx-auto text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">{permError.message}</p>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Permissions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage resource-level permissions for each role. Toggle checkboxes to allow or deny specific actions.
            </p>
          </div>
        </div>
      </div>

      {/* Filters & actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Resource filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1 flex-wrap">
          <button
            onClick={() => setFilterResource("")}
            className={`px-3 py-1.5 text-[0.55rem] font-medium rounded-md transition-colors ${
              !filterResource
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Resources
          </button>
          {existingResources.map((r) => (
            <button
              key={r}
              onClick={() => setFilterResource(filterResource === r ? "" : r)}
              className={`px-3 py-1.5 text-[0.55rem] font-medium rounded-md transition-colors ${
                filterResource === r
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {resourceLabels[r] || r}
              <span className="ml-1 opacity-50">({resourceCounts[r] || 0})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRowLabels(!showRowLabels)}
            className="text-[0.55rem] font-medium"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {showRowLabels ? "Hide Labels" : "Show Labels"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="text-[0.55rem] font-medium"
          >
            <Plus className="h-3 w-3" />
            Add Permission
          </Button>
        </div>
      </div>

      {/* Add new permission form */}
      {showAddForm && (
        <div className="border border-border/60 rounded-lg p-4 bg-secondary/10 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              New Permission
            </p>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                Role
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="h-8 text-xs border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                Resource
              </label>
              <Select value={newResource} onValueChange={setNewResource}>
                <SelectTrigger className="h-8 text-xs border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_RESOURCES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {resourceLabels[r] || r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                Action
              </label>
              <Select value={newAction} onValueChange={setNewAction}>
                <SelectTrigger className="h-8 text-xs border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {actionLabels[a] || a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => {
                const key = `${newRole}:${newResource}:${newAction}`;
                if (permMap.has(key)) {
                  toast.error("This permission already exists");
                  return;
                }
                createPerm.mutate({
                  role: newRole,
                  resource: newResource,
                  action: newAction,
                  allowed: true,
                });
              }}
              disabled={createPerm.isPending}
              className="px-4 py-2 text-[0.55rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {createPerm.isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Permission matrix */}
      {(!permissions || permissions.length === 0) && !filterResource ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            No permissions defined yet. Add permissions to control resource-level access.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.55rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3 w-3" />
            Add first permission
          </button>
        </div>
      ) : displayedCombos.length === 0 && filterResource ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No permissions found for "{resourceLabels[filterResource] || filterResource}".
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left px-4 py-3 text-[0.5rem] font-medium text-muted-foreground uppercase tracking-[0.1em] w-48">
                  {showRowLabels ? "Resource / Action" : "Action"}
                </th>
                {ALL_ROLES.map((role) => {
                  const style = ROLE_STYLES[role];
                  return (
                    <th
                      key={role}
                      className={`px-3 py-3 text-center text-[0.5rem] font-medium uppercase tracking-[0.1em] ${style.text}`}
                    >
                      {role.replace("_", " ")}
                    </th>
                  );
                })}
                <th className="px-2 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {displayedCombos.map(({ resource, action }) => {
                const key_base = `${resource}:${action}`;
                return (
                  <tr
                    key={key_base}
                    className="border-b border-border/30 hover:bg-secondary/10 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[0.55rem] font-medium">
                      {showRowLabels ? (
                        <span>
                          <span className="text-muted-foreground">{resourceLabels[resource] || resource}</span>
                          <span className="text-muted-foreground/40 mx-1">/</span>
                          <span>{actionLabels[action] || action}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{actionLabels[action] || action}</span>
                      )}
                    </td>
                    {ALL_ROLES.map((role) => {
                      const perm = permMap.get(`${role}:${resource}:${action}`);
                      const allowed = perm?.allowed ?? false;
                      const exists = !!perm;
                      return (
                        <td key={`${role}:${key_base}`} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => {
                              if (exists && perm) {
                                togglePerm.mutate({ id: perm.id, allowed: !allowed });
                              } else if (!exists) {
                                createPerm.mutate({ role, resource, action, allowed: true });
                              }
                            }}
                            disabled={togglePerm.isPending || createPerm.isPending}
                            className={`w-6 h-6 rounded-md border transition-all flex items-center justify-center mx-auto ${
                              allowed
                                ? "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                                : exists
                                  ? "bg-red-50 border-red-200 text-red-400 dark:bg-red-950/20 dark:border-red-800 dark:text-red-500"
                                  : "bg-transparent border-dashed border-border/40 text-muted-foreground/30 hover:border-border/60 hover:text-muted-foreground/50"
                            } disabled:opacity-60`}
                            title={
                              exists
                                ? `${allowed ? "Allowed" : "Denied"} — Click to toggle`
                                : "No rule — Click to allow"
                            }
                          >
                            {allowed ? (
                              <Check className="h-3 w-3" />
                            ) : exists ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5">
                      {permissions?.filter(
                        (p) => p.resource === resource && p.action === action,
                      ).length ? (
                        <button
                          onClick={() => {
                            const perms = permissions?.filter(
                              (p) => p.resource === resource && p.action === action,
                            );
                            if (perms?.length === 1 && perms[0]) {
                              setDeletingId(perms[0].id);
                            }
                          }}
                          className="p-1 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove all rules for this combo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {permissions && permissions.length > 0 && (
        <div className="flex items-center gap-4 text-[0.55rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700 flex items-center justify-center">
              <Check className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
            </span>
            Allowed ({permissions.filter((p) => p.allowed).length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800 flex items-center justify-center">
              <X className="h-2 w-2 text-red-400 dark:text-red-500" />
            </span>
            Denied ({permissions.filter((p) => !p.allowed).length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-dashed border-border/40" />
            Not set (click to create)
          </span>
          <span className="ml-auto">
            {permissions.length} rule{permissions.length !== 1 ? "s" : ""} total
          </span>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove permission</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the rule entirely, falling back to the default behavior. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePerm.mutate({ id: deletingId! })}
              disabled={deletePerm.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePerm.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
