import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";
import { isMockMode } from "@/lib/data-source";
import { mockGetProfile } from "@/lib/mock-session";
import {
  migratePreferences,
  type UserPreferences,
} from "@/lib/user-preferences";

/**
 * Shared "user-preferences" query — one source of truth for the signed-in
 * user's saved preferences, consumed by /settings (editing), the article
 * typography (posts.$slug) and the reader (theme + progress saving).
 *
 * The payload is normalized through `migratePreferences` so consumers always
 * receive a complete, valid `UserPreferences` (legacy top-level privacy keys
 * and pre-extension reading objects are folded in).
 *
 * NOTE: the /settings Save handler writes to this exact query key
 * (`["user-preferences", user.id]`) to warm the cache, so any change is
 * visible to the article page and the reader immediately on SPA navigation.
 */
export function useUserPreferences() {
  const { user } = useAuthSession();

  return useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user) return null;
      if (isMockMode()) {
        const p = mockGetProfile(user.id);
        return p?.preferences ? migratePreferences(p.preferences) : null;
      }
      const db = supabase;
      const { data } = await db
        .from("profiles")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.preferences ? migratePreferences(data.preferences) : null;
    },
    enabled: !!user,
    // No stale window: a preference saved on /settings must show up
    // immediately when navigating back to an article or the reader.
  });
}
