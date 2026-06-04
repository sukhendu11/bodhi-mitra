import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { createClient } from "@supabase/supabase-js";

/** Check if the current user has admin or super_admin role. */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    return { isAdmin: !!data, role: (data?.role as string | null) ?? null };
  });

export type UserRoleRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
};

/** Get all users with their roles. Only accessible by admin/super_admin (enforced server-side via RPC). */
export const getUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("get_user_roles", { _admin_id: userId });
    if (error) throw new Error(error.message);
    return (data ?? []) as UserRoleRow[];
  });

export interface SetRoleResult {
  ok: boolean;
  error?: string;
  role?: string;
}

/** Set a user's role. Permission checks enforced server-side by the RPC function. */
export const setUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { targetUserId: string; newRole: string };
    const { data: result, error } = await supabase.rpc("set_user_role", {
      _admin_id: userId,
      _target_user_id: input.targetUserId,
      _new_role: input.newRole,
    });
    if (error) throw new Error(error.message);
    return (result ?? { ok: true }) as unknown as SetRoleResult;
  });
