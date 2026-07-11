import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuthSession, isHardcodedAdmin, useUserRole, ROLE_LEVELS, type AppRole } from "@/hooks/useAuth";

function getLevel(role: string | null | undefined): number {
  return ROLE_LEVELS[role ?? ""] ?? 0;
}

export function checkPermission(
  role: string | null | undefined,
  minRole: AppRole,
): boolean {
  return getLevel(role) >= getLevel(minRole);
}

export interface PermissionState {
  user: User | null;
  role: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  can: (minRole: AppRole) => boolean;
}

export function usePermission(): PermissionState {
  const { user, loading: sessionLoading } = useAuthSession();
  const { data: role, isLoading: roleLoading } = useUserRole(user);

  const resolvedRole = useMemo(() => {
    if (isHardcodedAdmin(user)) return "super_admin";
    return role ?? null;
  }, [user, role]);

  const isSuperAdmin = resolvedRole === "super_admin";
  const isAdmin = isSuperAdmin || resolvedRole === "admin";

  const can = useMemo(
    () => (minRole: AppRole) => checkPermission(resolvedRole, minRole),
    [resolvedRole],
  );

  return {
    user,
    role: resolvedRole,
    isLoading: sessionLoading || roleLoading,
    isSuperAdmin,
    isAdmin,
    can,
  };
}

export { useAuthSession, isHardcodedAdmin, useUserRole };
