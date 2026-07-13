import type { AuthProvider, HttpError } from "@refinedev/core";
import { supabase } from "@/integrations/supabase/client";
import { isHardcodedAdmin } from "@/hooks/useAuth";

function toError(message: string): HttpError {
  return { message, statusCode: 401 };
}

export const refineAuthProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: toError(error.message) };
    return { success: true, redirectTo: "/admin" };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: toError(error.message) };
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return { authenticated: true };
    return { authenticated: false, redirectTo: "/login" };
  },

  getIdentity: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;

    return {
      id: user.id,
      email: user.email,
      name: user.email?.split("@")[0] ?? "Unknown",
      avatar: user.user_metadata?.avatar_url ?? null,
    };
  },

  getPermissions: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    if (isHardcodedAdmin(user)) return ["super_admin"];

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return data ? [data.role] : [];
  },

  onError: async (error: HttpError) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return { logout: true, redirectTo: "/login" };
    }
    return {};
  },
};
