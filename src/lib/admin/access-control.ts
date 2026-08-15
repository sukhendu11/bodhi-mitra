/**
 * Refine accessControlProvider — P2 (AD-029).
 *
 * Refine's idiomatic RBAC entry point (Access Control tutorial:
 * refine.dev/core/docs/advanced-tutorials/access-control/): a single
 * `can({resource, action, params})` that the framework calls for
 * `<CanAccess />` / `useCan`. This provider delegates to the SAME
 * role→resource permission matrix as the sync helpers in `rbac.ts`, so the
 * UI layer and the Refine layer can never drift.
 *
 * Actions accept Refine's canonical vocabulary (list/create/edit/show/delete)
 * AND our own (view/create/update/delete) — both normalize onto the matrix.
 * Role resolution is hook-free: mock mode reads the mock session (sync); real
 * mode mirrors `useUserRole` (hardcoded-admin bypass → `user_roles` table).
 */
import type { AccessControlProvider, CanParams, CanReturnType } from "@refinedev/core";
import { supabase } from "@/integrations/supabase/client";
import { isMockMode } from "@/lib/data-source";
import { getMockUserRole } from "@/lib/mock-session";
import { isHardcodedAdmin } from "@/hooks/useAuth";
import { can, type AdminPermission } from "./rbac";
import type { AdminResource } from "./data-provider";

/** Refine's canonical actions map onto the matrix's permission vocabulary. */
export function normalizeAdminAction(action: string): AdminPermission {
  switch (action) {
    case "list":
    case "show":
      return "view";
    case "edit":
      return "update";
    case "create":
      return "create";
    case "delete":
      return "delete";
    default:
      // Already one of ours (view/update/delete/create) — pass through.
      return (["view", "update", "create", "delete"] as AdminPermission[]).includes(
        action as AdminPermission,
      )
        ? (action as AdminPermission)
        : "view";
  }
}

/** Hook-free role resolution — same source as `useAdminRole`, without a hook. */
export async function resolveAdminRole(): Promise<string | null> {
  if (isMockMode()) return getMockUserRole();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  if (isHardcodedAdmin(user)) return "super_admin";
  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return (row?.role as string) ?? null;
}

/** The `can` implementation backing the provider (unit-testable). */
export async function canAccessAdminResource(params: CanParams): Promise<CanReturnType> {
  const role = await resolveAdminRole();
  const permission = normalizeAdminAction(String(params.action ?? "list"));
  const granted = can(role, params.resource as AdminResource, permission);
  return granted
    ? { can: true }
    : { can: false, reason: "Access denied for this role." };
}

/** Wire into `<Refine accessControlProvider={adminAccessControlProvider}>`. */
export const adminAccessControlProvider: AccessControlProvider = {
  can: canAccessAdminResource,
};
