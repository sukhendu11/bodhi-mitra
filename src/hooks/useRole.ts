import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "editor" | "author" | "moderator" | "user";

/** Role hierarchy levels (matching DB values from role_hierarchy table). */
export const ROLE_LEVELS: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  editor: 60,
  author: 40,
  moderator: 30,
  user: 10,
};

/** Get the current user's role. Returns null if no role assigned. */
export function useRole(user: User | null) {
  return useQuery({
    queryKey: ["user-role", user?.id ?? null],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) return null;
      return data.role as AppRole;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Check if the user has at least a minimum role level (sync check using cached role). */
export function hasMinRole(role: string | null | undefined, minRole: AppRole): boolean {
  if (!role) return false;
  const userLevel = ROLE_LEVELS[role] ?? 0;
  const minLevel = ROLE_LEVELS[minRole] ?? 0;
  return userLevel >= minLevel;
}

/** Check if user can manage other users (only super_admin). */
export function canManageUsers(role: string | null | undefined): boolean {
  return role === "super_admin";
}
