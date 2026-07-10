import type { ReactNode } from "react";
import { usePermission, checkPermission } from "@/hooks/usePermission";
import type { AppRole } from "@/hooks/useRole";

interface CanProps {
  role?: AppRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ role, children, fallback = null }: CanProps) {
  const { role: userRole, isLoading } = usePermission();

  if (isLoading) return null;

  if (role && !checkPermission(userRole, role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequireRoleProps {
  role: AppRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { role: userRole, isLoading } = usePermission();

  if (isLoading) return null;

  if (!checkPermission(userRole, role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
