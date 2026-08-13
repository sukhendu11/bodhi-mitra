import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";
import { isMockMode } from "@/lib/data-source";
import { mockGetProfile, mockUpsertProfile } from "@/lib/mock-session";
import { useLang } from "@/lib/i18n";
import { getSiteName } from "@/lib/siteSettings";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserRound,
  Palette,
  Bell,
  Eye,
  Lock,
  ShieldAlert,
  BookOpenText,
  Database,
  LifeBuoy,
  Download,
  UserCog,
} from "lucide-react";
import {
  DEFAULT_PREFERENCES,
  migratePreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { useTheme } from "@/hooks/useTheme";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { SettingsNav, type SettingsSectionDef } from "@/components/settings/SettingsNav";
import { ProfileAccountSection } from "@/components/settings/ProfileAccountSection";
import { ReadingSection } from "@/components/settings/ReadingSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { SupportLegalSection } from "@/components/settings/SupportLegalSection";

export const Route = createFileRoute("/settings")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => seoHead({
    title: "Settings",
    description: "Manage your account preferences and settings.",
    path: "/settings",
    siteName: loaderData,
    noIndex: true,
  }),
  component: SettingsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

/* ─── Scroll spy ───────────────────────────────────────────────────
   Tracks which settings section is currently in view so the sidebar /
   mobile chips highlight the right one as the user scrolls. */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const onScroll = () => {
      const offset = 160; // sticky header + scroll-mt-28 slack
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids.join(",")]);

  return active;
}

function SettingsPage() {
  const { user, loading } = useAuthSession();
  const { lang } = useLang();
  const location = useLocation();
  const bn = lang === "bn";
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();

  // ── Preferences state ─────────────────────────────────────────────
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Mock mode — read preferences + identity from the mock profiles store
      if (isMockMode()) {
        const p = mockGetProfile(user.id);
        return p
          ? {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              bio: p.bio,
              preferences: p.preferences,
            }
          : null;
      }
      const db = supabase;
      const { data } = await db
        .from("profiles")
        .select("display_name, avatar_url, bio, preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data ?? null) as {
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        preferences: Record<string, unknown> | null;
      } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Hydrate preferences from profile data through migratePreferences (which
  // also folds legacy top-level privacy keys into privacy.*).
  // Guard: while the user has unsaved edits, never re-hydrate — otherwise
  // changing the theme (which refetches the profile) would silently wipe
  // in-flight changes to other preferences.
  useEffect(() => {
    if (prefsDirty) return;
    if (profile?.preferences && typeof profile.preferences === "object") {
      setPrefs(migratePreferences(profile.preferences));
    } else {
      setPrefs({ ...DEFAULT_PREFERENCES });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, prefsDirty]);

  // Deep links (e.g. /settings#appearance from the profile quick link)
  // scroll the target section into view; scroll-mt-28 keeps it clear of
  // the sticky header. Re-runs once loading resolves so the element exists.
  useEffect(() => {
    if (!location.hash || loading) return;
    const el = document.getElementById(location.hash.replace(/^#/, ""));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, loading]);

  // ── Save preferences ──────────────────────────────────────────────
  const handleSavePreferences = async () => {
    if (!user) return;
    setSavingPrefs(true);
    if (isMockMode()) {
      mockUpsertProfile(user.id, { preferences: prefs });
      setSavingPrefs(false);
      setPrefsDirty(false);
      // Warm the shared preference cache so article pages / reader pick it up
      // immediately on SPA navigation.
      queryClient.setQueryData(["user-preferences", user.id], prefs);
      queryClient.invalidateQueries({ queryKey: ["user-preferences", user.id] });
      toast.success(bn ? "পছন্দ সংরক্ষিত হয়েছে" : "Preferences saved");
      refetch();
      return;
    }
    const db = supabase as any;
    const { error } = await db
      .from("profiles")
      .update({ preferences: prefs, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSavingPrefs(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPrefsDirty(false);
    queryClient.setQueryData(["user-preferences", user.id], prefs);
    queryClient.invalidateQueries({ queryKey: ["user-preferences", user.id] });
    toast.success(bn ? "পছন্দ সংরক্ষিত হয়েছে" : "Preferences saved");
    refetch();
  };

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setPrefsDirty(true);
  };

  const updateNotifications = (key: keyof UserPreferences["notifications"], value: boolean) => {
    setPrefs((p) => ({
      ...p,
      notifications: { ...p.notifications, [key]: value },
    }));
    setPrefsDirty(true);
  };

  const updatePrivacy = (key: keyof UserPreferences["privacy"], value: boolean) => {
    setPrefs((p) => ({
      ...p,
      privacy: { ...p.privacy, [key]: value },
    }));
    setPrefsDirty(true);
  };

  // Section definitions — grouped by user goal (Account / Reading &
  // Appearance / Privacy & Help). Data & Account is backend-only and hidden
  // in mock mode. Group order + section order inside a group drive the nav.
  const sections = useMemo<SettingsSectionDef[]>(() => {
    const all: (SettingsSectionDef & { backendOnly?: boolean })[] = [
      // ── ACCOUNT ──
      { id: "profile", group: "account", label: "Profile & Account", labelBn: "প্রোফাইল ও অ্যাকাউন্ট", icon: UserRound },
      { id: "security", group: "account", label: "Security", labelBn: "নিরাপত্তা", icon: Lock },
      { id: "danger", group: "account", label: "Danger Zone", labelBn: "বিপদ অঞ্চল", icon: ShieldAlert },
      // ── READING & APPEARANCE ──
      { id: "reading", group: "reading", label: "Reading", labelBn: "পঠন", icon: BookOpenText },
      { id: "appearance", group: "reading", label: "Appearance", labelBn: "চেহারা", icon: Palette },
      { id: "notifications", group: "reading", label: "Notifications", labelBn: "বিজ্ঞপ্তি", icon: Bell },
      // ── PRIVACY & HELP ──
      { id: "privacy", group: "privacy", label: "Privacy", labelBn: "গোপনীয়তা", icon: Eye },
      { id: "data", group: "privacy", label: "Data & Account", labelBn: "ডেটা ও অ্যাকাউন্ট", icon: Database, backendOnly: true },
      { id: "support", group: "privacy", label: "Support & Legal", labelBn: "সহায়তা ও আইনি", icon: LifeBuoy },
    ];
    return isMockMode() ? all.filter((s) => !s.backendOnly) : all;
  }, []);

  const activeSection = useScrollSpy(sections.map((s) => s.id));

  // Gate on session loading so SSR guest-render never flashes before hydration
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="h-4 w-24 skeleton-shimmer rounded mb-8" />
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <div className="hidden lg:block space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 skeleton-shimmer rounded-lg" />
            ))}
          </div>
          <div className="space-y-8">
            <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm space-y-5">
              <div className="h-5 w-40 skeleton-shimmer rounded" />
              <div className="h-4 w-full skeleton-shimmer rounded" />
              <div className="h-4 w-3/4 skeleton-shimmer rounded" />
              <div className="h-10 w-full skeleton-shimmer rounded-lg" />
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm space-y-4">
              <div className="h-5 w-32 skeleton-shimmer rounded" />
              <div className="h-4 w-full skeleton-shimmer rounded" />
              <div className="h-4 w-2/3 skeleton-shimmer rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <UserCog className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">{bn ? "সেটিংস" : "Settings"}</h1>
        <p className="text-base text-muted-foreground mb-6">
          {bn ? "আপনার পছন্দ পরিচালনা করতে সাইন ইন করুন।" : "Sign in to manage your preferences."}
        </p>
        <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/login"
            search={{
              message: bn ? "সেটিংস পরিচালনা করতে সাইন ইন করুন" : "Sign in to manage settings",
              redirect: "/settings",
            }}
          >
            {bn ? "সাইন ইন" : "Sign in"}
          </Link>
        </BrandCtaButton>
      </div>
    );
  }

  const handleReset = () => {
    const raw = profile?.preferences;
    const restored = raw && typeof raw === "object" ? migratePreferences(raw) : { ...DEFAULT_PREFERENCES };
    setPrefs(restored);
    setPrefsDirty(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
      <Link
        to="/profile"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> {bn ? "প্রোফাইলে ফিরুন" : "Back to Profile"}
      </Link>

      <div className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar / mobile chips */}
        <SettingsNav sections={sections} activeId={activeSection} onSelect={() => {}} bn={bn} />

        {/* Content column */}
        <div className="mt-8 lg:mt-0 space-y-8 min-w-0">
          <ProfileAccountSection
            profile={profile}
            onProfileSaved={() => {
              refetch();
            }}
          />
          <SecuritySection />
          <DangerZoneSection />
          <ReadingSection prefs={prefs} updatePref={updatePref} />
          <AppearanceSection prefs={prefs} updatePref={updatePref} setTheme={setTheme} />
          <NotificationsSection prefs={prefs} updatePref={updatePref} updateNotifications={updateNotifications} />
          <PrivacySection prefs={prefs} updatePrivacy={updatePrivacy} />

          {/* Data & Account — backend-only, hidden in mock mode */}
          {!isMockMode() && (
            <section id="data" className="scroll-mt-28 rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 text-base text-foreground mb-6">
                <Database className="h-4 w-4" />
                <h2 className="text-xl font-semibold">{bn ? "ডেটা ও অ্যাকাউন্ট" : "Data & Account"}</h2>
              </div>
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-base text-foreground">{bn ? "আপনার ডেটা এক্সপোর্ট করুন" : "Export your data"}</span>
                    <p className="text-sm text-muted-foreground/60 mt-0.5">
                      {bn ? "আপনার প্রোফাইল, ক্রয় ও পড়ার তথ্যের কপি ডাউনলোড করুন" : "Download a copy of your profile, purchases and reading data"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    {bn ? "এক্সপোর্ট" : "Export"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4 pt-5 border-t border-border/40">
                  <div>
                    <span className="text-base text-foreground">{bn ? "অ্যাকাউন্ট ব্যবস্থাপনা" : "Account management"}</span>
                    <p className="text-sm text-muted-foreground/60 mt-0.5">
                      {bn ? "অ্যাকাউন্ট স্থানান্তর ও বন্ধের বিকল্প" : "Account transfer and closure options"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById("danger")?.scrollIntoView({ behavior: "smooth" })}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {bn ? "ব্যবস্থাপনা করুন" : "Manage"}
                  </button>
                </div>
              </div>
            </section>
          )}

          <SupportLegalSection />

          {/* Sticky save bar — appears only when there are unsaved changes */}
          {prefsDirty && (
            <div className="sticky bottom-4 z-10">
              <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium">
                    {bn ? "অসংরক্ষিত পরিবর্তন" : "Unsaved changes"}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {bn ? "পরিবর্তনগুলো সংরক্ষণ করুন" : "Save your changes"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {bn ? "রিসেট" : "Reset"}
                </button>
                <BrandCtaButton
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className="px-4 py-2 text-xs"
                >
                  {savingPrefs
                    ? bn ? "সংরক্ষণ হচ্ছে…" : "Saving…"
                    : bn ? "সংরক্ষণ করুন" : "Save preferences"}
                </BrandCtaButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
