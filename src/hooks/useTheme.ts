import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";
import { isMockMode } from "@/lib/data-source";
import { mockGetProfile, mockUpsertProfile } from "@/lib/mock-session";
import { useSiteSettings } from "@/lib/siteSettings";
import type { UserPreferences } from "@/lib/user-preferences";

const STORAGE_KEY = "sabbe-satta-theme";

export type ThemeMode = "light" | "dark" | "system";

/**
 * Apply (or remove) the `.dark` class on `<html>`, respecting "system" mode.
 * This function is safe to call on the server (no-op) and on the client.
 */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    // "system" — follow OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

/** Persist theme choice to localStorage. */
function persistTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/** Read cached theme from localStorage, or return null. */
function readCachedTheme(): ThemeMode | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") return val;
  } catch {
    // localStorage unavailable
  }
  return null;
}

/**
 * Fetch the user's theme preference from Supabase profile.
 * Returns the theme mode or null if not set / not signed in.
 */
async function fetchThemePreference(userId: string | undefined): Promise<ThemeMode | null> {
  if (!userId) return null;
  try {
    // Mock mode — read from the mock profiles store
    if (isMockMode()) {
      const prefs = mockGetProfile(userId)?.preferences as Partial<UserPreferences> | undefined;
      if (prefs?.theme === "light" || prefs?.theme === "dark" || prefs?.theme === "system") {
        return prefs.theme;
      }
      return null;
    }
    const db = supabase as any;
    const { data, error } = await db
      .from("profiles")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.preferences) return null;
    const prefs = data.preferences as Partial<UserPreferences>;
    if (prefs.theme === "light" || prefs.theme === "dark" || prefs.theme === "system") {
      return prefs.theme;
    }
  } catch {
    // Silently ignore
  }
  return null;
}

/**
 * useTheme — Centralised theme management.
 *
 * Priority order (highest to lowest):
 * 1. User preference from Supabase (signed-in users)
 * 2. Cached preference from localStorage (repeat visitors)
 * 3. Admin-forced mode from site settings (only when it forces dark)
 * 4. "system" — defer to OS prefers-color-scheme (default)
 *
 * Returns the resolved theme mode and a setter that persists + applies instantly.
 */
export function useTheme() {
  const { user } = useAuthSession();
  const queryClient = useQueryClient();

  // Fetch the user's theme preference from Supabase
  const { data: userTheme } = useQuery({
    queryKey: ["user-theme-preference", user?.id],
    queryFn: () => fetchThemePreference(user?.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  // Resolve the effective theme: user pref > localStorage > admin-forced dark > "system"
  const siteConfig = useSiteSettings();
  const adminForcesDark = siteConfig.theme?.mode === "dark";
  const effective: ThemeMode =
    userTheme ?? readCachedTheme() ?? (adminForcesDark ? "dark" : "system");

  // Apply whenever the effective theme changes.
  // Note: we deliberately do NOT persist `effective` here — only explicit
  // user choices (setTheme) write to localStorage. Otherwise an admin-forced
  // dark mode inherited by a no-preference user would get stuck in storage
  // and silently override the admin if they later switch back to light.
  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (effective !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [effective]);

  // Save theme to Supabase + apply instantly + cache
  const setTheme = useCallback(
    async (mode: ThemeMode) => {
      // Apply immediately for instant feedback
      applyTheme(mode);
      persistTheme(mode);

      // Persist the theme if signed in
      if (!user) return;
      try {
        if (isMockMode()) {
          const existing = mockGetProfile(user.id)?.preferences || {};
          mockUpsertProfile(user.id, { preferences: { ...existing, theme: mode } });
          queryClient.invalidateQueries({ queryKey: ["user-theme-preference", user.id] });
          queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
          return;
        }
        const db = supabase as any;
        // Fetch existing preferences first to avoid overwriting
        const { data: existing } = await db
          .from("profiles")
          .select("preferences")
          .eq("user_id", user.id)
          .maybeSingle();
        const mergedPrefs = {
          ...(existing?.preferences || {}),
          theme: mode,
        };
        await db.from("profiles").upsert(
          {
            user_id: user.id,
            preferences: mergedPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        // Invalidate the preference query so it refetches
        queryClient.invalidateQueries({ queryKey: ["user-theme-preference", user.id] });
        // Also invalidate the profile query so settings page picks up changes
        queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      } catch {
        // Silently fail — local state is already applied
      }
    },
    [user, queryClient],
  );

  return { theme: effective, setTheme };
}
