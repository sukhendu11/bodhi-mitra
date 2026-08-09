import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession, signOut } from "@/hooks/useAuth";
import { isMockMode } from "@/lib/data-source";
import { mockGetProfile, mockUpsertProfile, mockDeleteProfile } from "@/lib/mock-session";
import { useLang } from "@/lib/i18n";
import { getSiteName } from "@/lib/siteSettings";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Globe,
  Bell,
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  Eye as VisibilityIcon,
  Settings as SettingsIcon,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/user-preferences";
import { useTheme } from "@/hooks/useTheme";
import { deleteMyAccount } from "@/lib/delete-account";
import { BrandCtaButton } from "@/components/BrandCtaButton";

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

function SettingsPage() {
  const { user, loading } = useAuthSession();
  const { lang, setLang } = useLang();
  const bn = lang === "bn";
  const { theme: effectiveTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── Preferences state ─────────────────────────────────────────────
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // ── Password change state ─────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Privacy state (saved as part of preferences)
  const [publicProfile, setPublicProfile] = useState(true);
  const [showReadingActivity, setShowReadingActivity] = useState(true);
  const [privacyDirty, setPrivacyDirty] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Mock mode — read preferences from the mock profiles store
      if (isMockMode()) {
        const p = mockGetProfile(user.id);
        return p ? { preferences: p.preferences } : null;
      }
      const db = supabase;
      const { data } = await db
        .from("profiles")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { preferences: Record<string, unknown> | null } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Hydrate preferences from profile data.
  // Guard: while the user has unsaved edits (prefsDirty / privacyDirty), never
  // re-hydrate — otherwise changing the theme (which refetches the profile)
  // would silently wipe in-flight changes to other preferences.
  useEffect(() => {
    if (prefsDirty || privacyDirty) return;

    if (profile?.preferences && typeof profile.preferences === "object") {
      const raw = profile.preferences as Record<string, unknown>;
      const merged: UserPreferences = { ...DEFAULT_PREFERENCES, ...raw };
      if (raw.reading && typeof raw.reading === "object") {
        merged.reading = {
          ...DEFAULT_PREFERENCES.reading,
          ...(raw.reading as Record<string, unknown>),
        } as UserPreferences["reading"];
      }
      // Reflect the live theme when the profile carries no explicit theme
      // choice (e.g. set via the header toggle), so the toggle never lies
      // about what the site is actually showing.
      if (typeof raw.theme !== "string") merged.theme = effectiveTheme;
      setPrefs(merged);

      // Hydrate privacy toggles from preferences
      if (typeof raw.public_profile === "boolean")
        setPublicProfile(raw.public_profile);
      if (typeof raw.show_reading_activity === "boolean")
        setShowReadingActivity(raw.show_reading_activity);
    } else {
      setPrefs({ ...DEFAULT_PREFERENCES, theme: effectiveTheme });
    }
  }, [profile, prefsDirty, privacyDirty, effectiveTheme]);

  // ── Save preferences ──────────────────────────────────────────────
  const handleSavePreferences = async () => {
    if (!user) return;
    setSavingPrefs(true);
    const prefsToSave = {
      ...prefs,
      public_profile: publicProfile,
      show_reading_activity: showReadingActivity,
    };
    if (isMockMode()) {
      mockUpsertProfile(user.id, { preferences: prefsToSave });
      setSavingPrefs(false);
      setPrefsDirty(false);
      setPrivacyDirty(false);
      toast.success(bn ? "পছন্দ সংরক্ষিত হয়েছে" : "Preferences saved");
      refetch();
      return;
    }
    const db = supabase as any;
    const { error } = await db
      .from("profiles")
      .update({ preferences: prefsToSave, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSavingPrefs(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPrefsDirty(false);
    setPrivacyDirty(false);
    toast.success(bn ? "পছন্দ সংরক্ষিত হয়েছে" : "Preferences saved");
    refetch();
  };

  // ── Change password ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(bn ? "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" : "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(bn ? "নতুন পাসওয়ার্ড দুটি মিলছে না" : "New passwords do not match");
      return;
    }
    // Demo accounts have fixed passwords — no password changes in mock mode
    if (isMockMode()) {
      toast.error(bn ? "ডেমো অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করা যায় না।" : "Demo accounts can't change passwords.");
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmNewPassword("");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bn ? "পাসওয়ার্ড সফলভাবে আপডেট হয়েছে" : "Password updated successfully");
    setShowPasswordForm(false);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      // Mock mode — delete the mock profile and clear the mock session locally
      if (isMockMode()) {
        mockDeleteProfile(user?.id ?? "");
        await signOut();
        toast.success(bn ? "অ্যাকাউন্ট মুছে ফেলা হয়েছে" : "Account deleted");
        navigate({ to: "/" });
        return;
      }
      const result = await deleteMyAccount();
      if (!result.ok) {
        toast.error(result.error);
        setDeletingAccount(false);
        return;
      }
      await signOut();
      toast.success(bn ? "অ্যাকাউন্ট মুছে ফেলা হয়েছে" : "Account deleted");
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : bn ? "অ্যাকাউন্ট মুছে ফেলতে ব্যর্থ হয়েছে" : "Failed to delete account");
      setDeletingAccount(false);
    }
  };

  const updatePref = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setPrefsDirty(true);
  };

  const updateReading = (
    key: keyof UserPreferences["reading"],
    value: string
  ) => {
    setPrefs((p) => ({
      ...p,
      reading: {
        ...p.reading,
        [key]: value as UserPreferences["reading"][typeof key],
      },
    }));
    setPrefsDirty(true);
  };

  const inputCls =
    "w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors duration-200";

  // Gate on session loading so SSR guest-render never flashes before hydration
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <div className="h-4 w-24 skeleton-shimmer rounded mb-8" />
        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 skeleton-shimmer rounded" />
            <div className="h-5 w-32 skeleton-shimmer rounded" />
          </div>
          <div className="h-4 w-full skeleton-shimmer rounded" />
          <div className="h-4 w-3/4 skeleton-shimmer rounded" />
          <div className="h-10 w-full skeleton-shimmer rounded-lg" />
        </div>
        <div className="mt-8 rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm space-y-4">
          <div className="h-5 w-24 skeleton-shimmer rounded" />
          <div className="h-4 w-full skeleton-shimmer rounded" />
          <div className="h-4 w-2/3 skeleton-shimmer rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <SettingsIcon className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">{bn ? "সেটিংস" : "Settings"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
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

  const isDirty = prefsDirty || privacyDirty;

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Link
        to="/profile"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> {bn ? "প্রোফাইলে ফিরুন" : "Back to Profile"}
      </Link>

      <div className="mt-8 space-y-8">
        {/* ── Preferences ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground mb-6">
            <SettingsIcon className="h-4 w-4" />
            <h1 className="text-xl font-semibold">{bn ? "পছন্দসমূহ" : "Preferences"}</h1>
          </div>

          <div className="space-y-6">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prefs.theme === "dark" ? (
                  <Moon className="h-3.5 w-3.5 text-muted-foreground/60" />
                ) : prefs.theme === "light" ? (
                  <Sun className="h-3.5 w-3.5 text-muted-foreground/60" />
                ) : (
                  <Monitor className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
                <span className="text-sm text-foreground">{bn ? "ডিসপ্লে থিম" : "Display theme"}</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.theme}
                onValueChange={(v) => {
                  if (v) {
                    const mode = v as UserPreferences["theme"];
                    updatePref("theme", mode);
                    setTheme(mode);
                  }
                }}
              >
                <ToggleGroupItem value="light" aria-label={bn ? "লাইট থিম" : "Light theme"}>
                  {bn ? "লাইট" : "Light"}
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label={bn ? "ডার্ক থিম" : "Dark theme"}>
                  {bn ? "ডার্ক" : "Dark"}
                </ToggleGroupItem>
                <ToggleGroupItem value="system" aria-label={bn ? "সিস্টেম থিম" : "System theme"}>
                  {bn ? "সিস্টেম" : "System"}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-sm text-foreground">{bn ? "ভাষা" : "Language"}</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={lang}
                onValueChange={(v) => {
                  if (v === "en" || v === "bn") {
                    updatePref("locale", v);
                    setLang(v);
                  }
                }}
              >
                <ToggleGroupItem value="en" aria-label="English">
                  English
                </ToggleGroupItem>
                <ToggleGroupItem value="bn" aria-label="বাংলা">
                  বাংলা
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Email notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground/60" />
                <div>
                  <span className="text-sm text-foreground">
                    {bn ? "ইমেইল বিজ্ঞপ্তি" : "Email notifications"}
                  </span>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {bn ? "মন্তব্য, উত্তর এবং নিউজলেটার সম্পর্কে আপডেট পান" : "Receive updates about comments, replies, and newsletters"}
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.email_notifications}
                onCheckedChange={(v) => {
                  updatePref("email_notifications", v);
                }}
                aria-label="Toggle email notifications"
              />
            </div>

            <hr className="border-border/40" />

            {/* Reading: font size */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-sm text-foreground">
                  {bn ? "পড়ার ফন্টের আকার" : "Reading font size"}
                </span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.reading.font_size}
                onValueChange={(v) => {
                  if (v) updateReading("font_size", v);
                }}
              >
                <ToggleGroupItem value="sm" aria-label={bn ? "ছোট ফন্ট" : "Small font"}>
                  {bn ? "ছোট" : "Sm"}
                </ToggleGroupItem>
                <ToggleGroupItem value="md" aria-label={bn ? "মাঝারি ফন্ট" : "Medium font"}>
                  {bn ? "মাঝারি" : "Md"}
                </ToggleGroupItem>
                <ToggleGroupItem value="lg" aria-label={bn ? "বড় ফন্ট" : "Large font"}>
                  {bn ? "বড়" : "Lg"}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Reading: line spacing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-sm text-foreground">{bn ? "লাইনের ব্যবধান" : "Line spacing"}</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.reading.line_spacing}
                onValueChange={(v) => {
                  if (v) updateReading("line_spacing", v);
                }}
              >
                <ToggleGroupItem value="normal" aria-label={bn ? "স্বাভাবিক ব্যবধান" : "Normal spacing"}>
                  {bn ? "স্বাভাবিক" : "Normal"}
                </ToggleGroupItem>
                <ToggleGroupItem value="relaxed" aria-label={bn ? "প্রশস্ত ব্যবধান" : "Relaxed spacing"}>
                  {bn ? "প্রশস্ত" : "Relaxed"}
                </ToggleGroupItem>
                <ToggleGroupItem value="wide" aria-label={bn ? "বিস্তৃত ব্যবধান" : "Wide spacing"}>
                  {bn ? "বিস্তৃত" : "Wide"}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Save / Reset */}
          <div className="mt-6 pt-6 border-t border-border/40 flex items-center gap-3">
            <BrandCtaButton
              type="button"
              onClick={handleSavePreferences}
              disabled={!isDirty || savingPrefs}
              className="px-4 py-2 text-xs"
            >
              {savingPrefs
                ? bn ? "সংরক্ষণ হচ্ছে…" : "Saving…"
                : bn ? "পছন্দ সংরক্ষণ করুন" : "Save preferences"}
            </BrandCtaButton>
            {isDirty && (
              <button
                type="button"
                onClick={() => {
                  const dbPrefs = (profile as Record<string, any>)?.preferences;
                  const restored = (
                    dbPrefs && typeof dbPrefs === "object"
                      ? { ...DEFAULT_PREFERENCES, ...dbPrefs }
                      : { ...DEFAULT_PREFERENCES, theme: effectiveTheme }
                  ) as UserPreferences;
                  setPrefs(restored);
                  setPublicProfile(
                    dbPrefs?.public_profile !== false
                  );
                  setShowReadingActivity(
                    dbPrefs?.show_reading_activity !== false
                  );
                  setPrefsDirty(false);
                  setPrivacyDirty(false);
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {bn ? "রিসেট" : "Reset"}
              </button>
            )}
          </div>
        </div>

        {/* ── Privacy ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground mb-6">
            <VisibilityIcon className="h-4 w-4" />
            <h2 className="text-xl font-semibold">{bn ? "গোপনীয়তা" : "Privacy"}</h2>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">
                  {bn ? "সর্বজনীন প্রোফাইল" : "Public profile"}
                </span>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {bn ? "অন্যদের আপনার প্রোফাইল তথ্য দেখার অনুমতি দিন" : "Allow others to see your profile information"}
                </p>
              </div>
              <Switch
                checked={publicProfile}
                onCheckedChange={(v) => {
                  setPublicProfile(v);
                  setPrivacyDirty(true);
                }}
                aria-label="Toggle public profile"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">
                  {bn ? "পড়ার কার্যকলাপ দেখান" : "Show reading activity"}
                </span>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {bn ? "আপনার পড়ার অগ্রগতি এবং সম্পন্ন বই প্রদর্শন করুন" : "Display your reading progress and completed books"}
                </p>
              </div>
              <Switch
                checked={showReadingActivity}
                onCheckedChange={(v) => {
                  setShowReadingActivity(v);
                  setPrivacyDirty(true);
                }}
                aria-label="Toggle reading activity visibility"
              />
            </div>
          </div>
        </div>

        {/* ── Password ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground mb-6">
            <Lock className="h-4 w-4" />
            <h2 className="text-xl font-semibold">{bn ? "নিরাপত্তা" : "Security"}</h2>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-4 w-4" />
            {showPasswordForm ? (bn ? "বাতিল" : "Cancel") : (bn ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change password")}
          </button>

          {showPasswordForm && (
            <form
              onSubmit={handleChangePassword}
              className="mt-4 space-y-3 max-w-sm"
            >
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
                  {bn ? "নতুন পাসওয়ার্ড" : "New password"}
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={bn ? "কমপক্ষে ৬ অক্ষর" : "At least 6 characters"}
                    className={inputCls + " pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPw ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
                  {bn ? "নতুন পাসওয়ার্ড নিশ্চিত করুন" : "Confirm new password"}
                </label>
                <input
                  type={showNewPw ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={bn ? "নতুন পাসওয়ার্ড আবার লিখুন" : "Re-enter new password"}
                  className={inputCls}
                />
              </div>
              <BrandCtaButton
                type="submit"
                disabled={
                  changingPassword ||
                  !newPassword ||
                  !confirmNewPassword ||
                  newPassword !== confirmNewPassword
                }
                className="px-4 py-2 text-xs"
              >
                {changingPassword
                  ? bn ? "আপডেট হচ্ছে…" : "Updating…"
                  : bn ? "পাসওয়ার্ড আপডেট করুন" : "Update password"}
              </BrandCtaButton>
            </form>
          )}
        </div>

        {/* ── Delete Account ──────────────────────────────────── */}
        <div className="rounded-2xl border border-red-200/30 bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-red-500 mb-6">
            <Trash2 className="h-4 w-4" />
            <h2 className="text-xl font-semibold">{bn ? "বিপদ অঞ্চল" : "Danger Zone"}</h2>
          </div>

          {!showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {bn
                  ? "আপনার অ্যাকাউন্ট এবং সম্পর্কিত সব তথ্য স্থায়ীভাবে মুছে ফেলুন। এই কাজটি ফিরিয়ে আনা যাবে না।"
                  : "Permanently delete your account and all associated data. This action cannot be undone."}
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-1.5 text-xs font-medium text-red-500 border border-red-300/40 hover:bg-red-500/10 transition-colors"
              >
                {bn ? "আমার অ্যাকাউন্ট মুছুন" : "Delete my account"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>
                  {bn
                    ? "এটি আপনার প্রোফাইল, বুকমার্ক, ক্রয়, পড়ার অগ্রগতি এবং সম্পর্কিত সব তথ্য স্থায়ীভাবে মুছে ফেলবে। নিশ্চিত করতে"
                    : "This will permanently delete your profile, bookmarks, purchases, reading progress, and all associated data. Type"}{" "}
                  <span className="font-mono font-bold text-red-300">DELETE</span>{" "}
                  {bn ? "লিখুন।" : "to confirm."}
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={bn ? 'নিশ্চিত করতে "DELETE" লিখুন' : 'Type "DELETE" to confirm'}
                className="w-full border border-destructive/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-destructive/60 focus-visible:ring-1 focus-visible:ring-destructive/40 transition-colors duration-200"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                  className="px-4 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {deletingAccount
                    ? bn ? "মুছে ফেলা হচ্ছে…" : "Deleting…"
                    : bn ? "স্থায়ীভাবে আমার অ্যাকাউন্ট মুছুন" : "Permanently delete my account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {bn ? "বাতিল" : "Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
