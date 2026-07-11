import type { AccessControlProvider } from "@refinedev/core";
import { ROLE_LEVELS } from "@/hooks/useAuth";

export const refineAccessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !resource || !action) return { can: false };

    const { isHardcodedAdmin } = await import("@/hooks/useAuth");
    if (isHardcodedAdmin(user)) return { can: true };

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = (roleRow?.role as string | undefined) ?? "user";
    const level = ROLE_LEVELS[role] ?? 0;

    const requiredLevel = getRequiredLevel(resource, action);
    return { can: level >= requiredLevel };
  },
};

function getRequiredLevel(resource: string, action: string): number {
  if (action === "delete" && resource === "users") return ROLE_LEVELS.super_admin;
  if (["users", "audit"].includes(resource)) return ROLE_LEVELS.super_admin;
  if (action === "delete") return ROLE_LEVELS.admin;
  if (action === "create" || action === "edit") return ROLE_LEVELS.editor;
  if (["settings"].includes(resource)) return ROLE_LEVELS.admin;
  return ROLE_LEVELS.editor;
}
