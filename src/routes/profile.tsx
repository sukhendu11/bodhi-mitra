import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";
import { getSiteName } from "@/lib/siteSettings";
import { useLang } from "@/lib/i18n";
import { ErrorPage } from "@/components/error-page";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Globe,
  Bell,
  BookOpen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// ── User preferences types ─────────────────────────────────────────────

export type UserPreferences = {
  /** Display theme override. "system" defers to OS preference. */
  theme: "light" | "dark" | "system";
  /** Content locale preference. */
  locale: "en" | "bn";
  /** Master toggle for email notifications (comments, newsletters, etc.). */
  email_notifications: boolean;
  /** Reading experience preferences. */
  reading: {
    font_size: "sm" | "md" | "lg";
    line_spacing: "normal" | "relaxed" | "wide";
  };
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  locale: "en",
  email_notifications: true,
  reading: {
    font_size: "md",
    line_spacing: "normal",
  },
};

export const Route = createFileRoute("/profile")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [{ title: `Profile — ${loaderData}` }, { name: "description", content: "Your profile." }],
  }),
  component: ProfilePage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function ProfilePage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Preferences state (initialized from DB after fetch)
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const db = supabase as any;
      const { data } = await db.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      return data as {
        display_name: string | null;
        avatar_url: string | null;
        created_at: string;
        preferences: Record<string, unknown> | null;
      } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Hydrate preferences from profile data — separate from queryFn (no side effects in queryFn)
  useEffect(() => {
    if (profile?.preferences && typeof profile.preferences === "object") {
      const raw = profile.preferences as Record<string, unknown>;
      const merged: UserPreferences = { ...DEFAULT_PREFERENCES, ...raw };
      // Deep merge the nested reading sub-object
      if (raw.reading && typeof raw.reading === "object") {
        merged.reading = {
          ...DEFAULT_PREFERENCES.reading,
          ...(raw.reading as Record<string, unknown>),
        } as UserPreferences["reading"];
      }
      setPrefs(merged);
    } else {
      setPrefs(DEFAULT_PREFERENCES);
    }
  }, [profile]);

  const { data: commentCount } = useQuery({
    queryKey: ["user-comment-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const db = supabase as any;
      const { count } = await db
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    const db = supabase as any;
    await db.from("profiles").upsert({
      user_id: user.id,
      display_name: displayName.trim(),
      updated_at: new Date().toISOString(),
    });
    setEditing(false);
    refetch();
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSavingPrefs(true);
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
    toast.success("Preferences saved");
    refetch();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated successfully");
    setShowPasswordForm(false);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const inputCls =
    "w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40";

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to view and edit your profile.</p>
        <Link
          to="/login"
          search={{ message: "Sign in to view your profile", redirect: "/profile" }}
          className="px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-white transition-all duration-200"
          style={{ backgroundColor: "var(--color-saffron)" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const initials = (profile?.display_name || user.email || "U").charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
        year: "numeric",
        month: "long",
      })
    : "N/A";

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Link
        to="/"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Home
      </Link>

      <div className="mt-8 border border-border/60 p-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center text-xl font-medium text-foreground shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "Profile avatar"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!displayName.trim()}
                    className="px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">{profile?.display_name || "Anonymous"}</h1>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </div>
              </div>
            )}
          </div>
        </div>

        {!editing && (
          <button
            onClick={() => {
              setDisplayName(profile?.display_name || "");
              setEditing(true);
            }}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Edit display name
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-border/40 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground/60" />
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                Member since
              </p>
              <p className="text-sm">{memberSince}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                Comments
              </p>
              <p className="text-sm">{commentCount ?? 0}</p>
            </div>
          </div>
        </div>        {/* Change password section */}
        <div className="mt-8 pt-6 border-t border-border/40">
          <button
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-4 w-4" />
            {showPasswordForm ? "Cancel" : "Change password"}
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 max-w-sm">
              <div>
                <label className="block text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputCls + " pr-10"}
                  />
                    <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
                  Confirm new password
                </label>
                <input
                  type={showNewPw ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={
                  changingPassword ||
                  !newPassword ||
                  !confirmNewPassword ||
                  newPassword !== confirmNewPassword
                }
                className="px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {changingPassword ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>

        {/* ── Preferences section ─────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm text-foreground mb-5">
            <Sun className="h-4 w-4" />
            Preferences
          </div>

          <div className="space-y-5">
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
                <span className="text-sm text-foreground">Display theme</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.theme}
                onValueChange={(v) => {
                  if (v) {
                    setPrefs((p) => ({ ...p, theme: v as UserPreferences["theme"] }));
                    setPrefsDirty(true);
                  }
                }}
              >
                <ToggleGroupItem value="light" aria-label="Light theme">
                  Light
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label="Dark theme">
                  Dark
                </ToggleGroupItem>
                <ToggleGroupItem value="system" aria-label="System theme">
                  System
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-sm text-foreground">Language</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.locale}
                onValueChange={(v) => {
                  if (v) {
                    setPrefs((p) => ({ ...p, locale: v as UserPreferences["locale"] }));
                    setPrefsDirty(true);
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
                  <span className="text-sm text-foreground">Email notifications</span>
                  <p className="text-[0.55rem] text-muted-foreground/60 mt-0.5">
                    Receive updates about comments, replies, and newsletters
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.email_notifications}
                onCheckedChange={(v) => {
                  setPrefs((p) => ({ ...p, email_notifications: v }));
                  setPrefsDirty(true);
                }}
                aria-label="Toggle email notifications"
              />
            </div>

            {/* Reading: font size */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-sm text-foreground">Reading font size</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.reading.font_size}
                onValueChange={(v) => {
                  if (v) {
                    setPrefs((p) => ({
                      ...p,
                      reading: { ...p.reading, font_size: v as UserPreferences["reading"]["font_size"] },
                    }));
                    setPrefsDirty(true);
                  }
                }}
              >
                <ToggleGroupItem value="sm" aria-label="Small font">
                  Sm
                </ToggleGroupItem>
                <ToggleGroupItem value="md" aria-label="Medium font">
                  Md
                </ToggleGroupItem>
                <ToggleGroupItem value="lg" aria-label="Large font">
                  Lg
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Reading: line spacing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-sm text-foreground">Line spacing</span>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={prefs.reading.line_spacing}
                onValueChange={(v) => {
                  if (v) {
                    setPrefs((p) => ({
                      ...p,
                      reading: { ...p.reading, line_spacing: v as UserPreferences["reading"]["line_spacing"] },
                    }));
                    setPrefsDirty(true);
                  }
                }}
              >
                <ToggleGroupItem value="normal" aria-label="Normal spacing">
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="relaxed" aria-label="Relaxed spacing">
                  Relaxed
                </ToggleGroupItem>
                <ToggleGroupItem value="wide" aria-label="Wide spacing">
                  Wide
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Save / Reset */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={!prefsDirty || savingPrefs}
              className="px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {savingPrefs ? "Saving…" : "Save preferences"}
            </button>
            {prefsDirty && (
              <button
                type="button"
                onClick={() => {
                  // Reset to DB values from latest profile fetch
                  const dbPrefs = (profile as any)?.preferences;
                  setPrefs(
                    dbPrefs && typeof dbPrefs === "object"
                      ? ({ ...DEFAULT_PREFERENCES, ...dbPrefs } as UserPreferences)
                      : DEFAULT_PREFERENCES,
                  );
                  setPrefsDirty(false);
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
