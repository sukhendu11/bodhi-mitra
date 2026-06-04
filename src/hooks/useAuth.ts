import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Admin status is determined solely by the `user_roles` table.
 * Bootstrapping the first admin uses the `claim_admin_role` RPC via /onboarding.
 */
export function isHardcodedAdmin(_user: User | null) {
  return false;
}

export function useIsAdmin(user: User | null) {
  return useQuery({
    queryKey: ["is-admin", user?.id ?? null],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export async function signOut() {
  const result = await supabase.auth.signOut();
  if (result.error) return result;
  await supabase.auth.getSession();
  return result;
}
