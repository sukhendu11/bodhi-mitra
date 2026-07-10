import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/hooks/useRole";

export { requireSupabaseAuth };

export interface AuthContext {
  supabase: any;
  userId: string;
  claims: Record<string, unknown>;
  role?: AppRole;
}

const HARDCODED_ADMIN_EMAIL = "admin@bodhimitra.test";

function getRoleLevel(role: string | null | undefined): number {
  if (!role) return 0;
  const levels: Record<string, number> = {
    super_admin: 100,
    admin: 80,
    editor: 60,
    author: 40,
    moderator: 30,
    user: 10,
  };
  return levels[role] ?? 0;
}

async function resolveUserRole(
  supabase: any,
  userId: string,
  email: string | null,
): Promise<AppRole> {
  if (email?.toLowerCase() === HARDCODED_ADMIN_EMAIL) {
    return "super_admin";
  }
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!roleRow?.role) {
    throw new Error("Unauthorized: No role assigned");
  }
  return roleRow.role as AppRole;
}

export function checkPermission(
  role: string | null | undefined,
  minRole: AppRole,
): boolean {
  return getRoleLevel(role) >= getRoleLevel(minRole);
}

export function canManageUsers(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export const requireMinRole = (minRole: AppRole) =>
  createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context, data }) => {
      const ctx = context as AuthContext;
      const { supabase, userId, claims } = ctx;
      const email = (claims?.email as string | null) ?? null;

      const role = await resolveUserRole(supabase, userId, email);

      if (getRoleLevel(role) < getRoleLevel(minRole)) {
        throw new Error(`Unauthorized: Requires ${minRole} role or higher`);
      }

      return next({ context: { ...ctx, role } });
    });

export const requirePermission = (resource: string, action: string) =>
  createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const ctx = context as AuthContext;
      const { supabase, userId, claims } = ctx;
      const email = (claims?.email as string | null) ?? null;

      const role = await resolveUserRole(supabase, userId, email);

      if (getRoleLevel(role) >= getRoleLevel("super_admin")) {
        return next({ context: { ...ctx, role } });
      }

      const { data: allowed } = await supabase.rpc("has_permission", {
        _resource: resource,
        _action: action,
        _user_id: userId,
      });

      if (!allowed) {
        throw new Error(`Unauthorized: Missing ${resource}:${action} permission`);
      }

      return next({ context: { ...ctx, role } });
    });
