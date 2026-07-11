import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "editor" | "author" | "moderator" | "user";

/** Role hierarchy levels. */
export const ROLE_LEVELS: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  editor: 60,
  author: 40,
  moderator: 30,
  user: 10,
};

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let signedOut = false;

    const invalidateUserData = () => {
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") signedOut = true;
      setSession(event === "SIGNED_OUT" ? null : s);
      setLoading(false);
      invalidateUserData();
    });

    supabase.auth.getUser()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (signedOut || error || !data.user) {
          setSession(null);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        if (!cancelled && !signedOut) setSession(sessionData.session);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return { session, user: session?.user ?? null, loading };
}

const HARDCODED_ADMIN_EMAIL = "admin@bodhimitra.test";

/**
 * Hardcoded admin bypass for demo/development.
 * Anyone who signs in with the default admin email is treated as super_admin
 * without needing a `user_roles` database entry.
 */
export function isHardcodedAdmin(user: User | null) {
  if (!user?.email) return false;
  return user.email.toLowerCase() === HARDCODED_ADMIN_EMAIL.toLowerCase();
}

/** Get the current user's role from the database. Returns null if no role assigned. */
export function useUserRole(user: User | null) {
  return useQuery({
    queryKey: ["user-role", user?.id ?? null],
    queryFn: async () => {
      if (!user) return null;
      if (isHardcodedAdmin(user)) return "super_admin";
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) return null;
      return data.role as string;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useIsAdmin(user: User | null) {
  return useQuery({
    queryKey: ["is-admin", user?.id ?? null],
    queryFn: async () => {
      if (!user) return false;
      // Hardcoded admin bypass — no database row needed
      if (isHardcodedAdmin(user)) return true;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Check if user can manage other users (super_admin only). */
export function useCanManageUsers(user: User | null) {
  return useQuery({
    queryKey: ["can-manage-users", user?.id ?? null],
    queryFn: async () => {
      if (!user) return false;
      if (isHardcodedAdmin(user)) return true;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Check if a role string has super_admin level (sync, no DB call). */
export function canManageUsers(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export async function signOut() {
  const result = await supabase.auth.signOut();
  if (result.error) return result;
  await supabase.auth.getSession();
  return result;
}
