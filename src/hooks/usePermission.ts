import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuthSession, isHardcodedAdmin, useUserRole } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useRole";

const ROLE_LEVELS: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  editor: 60,
  author: 40,
  moderator: 30,
  user: 10,
};

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
