import { useRef, useState, type ChangeEvent } from "react";
import { Pencil, Mail, ShieldCheck, Link2, Camera, Trash2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { isMockMode } from "@/lib/data-source";
import { supabase } from "@/integrations/supabase/client";
import { mockUpsertProfile, mockSetSessionAvatar } from "@/lib/mock-session";
import { useAuthSession } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SettingsSectionCard } from "./SettingsSectionCard";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

const inputCls =
  "w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors duration-200";

/**
 * Profile & Account — avatar, display name, email, bio. The identity editing
 * previously lived on /profile; it now belongs here (the profile page is a
 * pure reading dashboard). Verification + connected accounts are backend-only
 * (Supabase auth providers) and stay hidden until the real backend is wired.
 */
export function ProfileAccountSection({
  profile,
  onProfileSaved,
}: {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null | undefined;
  onProfileSaved: () => void;
}) {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const bn = lang === "bn";

  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [bioValue, setBioValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  // ── Avatar upload state ────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarValue, setAvatarValue] = useState<string | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const hasSavedAvatar = !!profile?.avatar_url;
  // While a new avatar is pending, preview it; otherwise show the saved one.
  const displayAvatar = editingAvatar && avatarValue ? avatarValue : profile?.avatar_url;

  const initials = (profile?.display_name || user?.email || "U").charAt(0).toUpperCase();

  const saveName = async () => {
    const name = nameValue.trim();
    if (!name || !user) return;
    setSavingName(true);
    if (isMockMode()) {
      mockUpsertProfile(user.id, { display_name: name });
    } else {
      const db = supabase as any;
      const { error } = await db.from("profiles").upsert({
        user_id: user.id,
        display_name: name,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setSavingName(false);
        toast.error(error.message);
        return;
      }
    }
    setSavingName(false);
    setEditingName(false);
    onProfileSaved();
    toast.success(bn ? "প্রদর্শনের নাম আপডেট হয়েছে" : "Display name updated");
  };

  const saveBio = async () => {
    const bio = bioValue.trim();
    if (!user) return;
    setSavingBio(true);
    if (isMockMode()) {
      mockUpsertProfile(user.id, { bio: bio || null });
    } else {
      const db = supabase as any;
      const { error } = await db.from("profiles").upsert({
        user_id: user.id,
        bio: bio || null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setSavingBio(false);
        toast.error(error.message);
        return;
      }
    }
    setSavingBio(false);
    setEditingBio(false);
    onProfileSaved();
    toast.success(bn ? "বায়ো আপডেট হয়েছে" : "Bio updated");
  };

  /* ── Avatar upload ────────────────────────────────────────────── */

  /**
   * Validate + preview a chosen image. Mock mode persists the data URL
   * directly into the profiles store; real mode uploads the File to the
   * `avatars` Supabase Storage bucket (wired later) and stores the URL.
   */
  const onAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(bn ? "অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন" : "Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(bn ? "ছবিটি ২ এমবির বেশি হতে পারবে না" : "Image must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarFile(file);
      setAvatarValue(reader.result as string);
      setEditingAvatar(true);
    };
    reader.readAsDataURL(file);
  };

  /** Persist a new avatar (mock store or Supabase Storage → profiles). */
  const saveAvatar = async () => {
    if (!user || !avatarValue) return;
    // Real mode uploads the raw File — never fall back to the data-URL text.
    const file = avatarFile;
    if (!isMockMode() && !file) return;
    setSavingAvatar(true);
    try {
      let url = avatarValue;
      if (!isMockMode()) {
        const uploadFile = file as File; // guarded above — narrowing can't cross the branch
        const db = supabase as any;
        const ext = (uploadFile.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `avatars/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, uploadFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: uploadFile.type || undefined,
          });
        if (upErr) throw new Error(upErr.message);
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        url = data.publicUrl;
        const { error } = await db.from("profiles").upsert({
          user_id: user.id,
          avatar_url: url,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
        // Keep the header avatar in sync (same source the header reads).
        await supabase.auth.updateUser({ data: { avatar_url: url } });
      } else {
        mockUpsertProfile(user.id, { avatar_url: url });
        mockSetSessionAvatar(user.id, url);
      }
      setSavingAvatar(false);
      setEditingAvatar(false);
      setAvatarValue(url);
      setAvatarFile(null);
      onProfileSaved();
      toast.success(bn ? "অবতার আপডেট হয়েছে" : "Avatar updated");
    } catch (err) {
      setSavingAvatar(false);
      console.error("Avatar upload failed:", err);
      toast.error(
        bn
          ? "অবতার আপলোড ব্যর্থ হয়েছে — পরে আবার চেষ্টা করুন"
          : "Avatar upload failed — please try again",
      );
    }
  };

  /** Remove the saved avatar (both store + session/header sync). */
  const removeAvatar = async () => {
    if (!user) return;
    setSavingAvatar(true);
    try {
      if (isMockMode()) {
        mockUpsertProfile(user.id, { avatar_url: null });
        mockSetSessionAvatar(user.id, null);
      } else {
        const db = supabase as any;
        const { error } = await db.from("profiles").upsert({
          user_id: user.id,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
        await supabase.auth.updateUser({ data: { avatar_url: null } });
      }
      setSavingAvatar(false);
      setEditingAvatar(false);
      setAvatarValue(null);
      setAvatarFile(null);
      onProfileSaved();
      toast.success(bn ? "অবতার সরানো হয়েছে" : "Avatar removed");
    } catch (err) {
      setSavingAvatar(false);
      console.error("Avatar removal failed:", err);
      toast.error(bn ? "অবতার সরানো ব্যর্থ হয়েছে" : "Could not remove avatar");
    }
  };

  return (
    <SettingsSectionCard icon={Pencil} title={bn ? "প্রোফাইল ও অ্যাকাউন্ট" : "Profile & Account"} id="profile">
      <div className="space-y-6">
        {/* ── Avatar + name + email ─────────────────────────────── */}
        <div className="flex items-start gap-5">
          <div className="group/avatar relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-saffron-100)] to-[var(--color-saffron-200)] dark:from-saffron-900 dark:to-saffron-800 flex items-center justify-center text-xl font-medium text-[var(--color-saffron-700)] dark:text-[var(--color-saffron-300)] ring-2 ring-[var(--color-saffron)]/20 overflow-hidden">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={profile?.display_name || "Profile avatar"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* Camera overlay — opens the file picker on click/hover */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingAvatar}
              aria-label={bn ? "অবতার পরিবর্তন করুন" : "Change avatar"}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 text-transparent hover:bg-black/40 hover:text-white transition-all duration-300 group-hover/avatar:bg-black/25 group-hover/avatar:text-white focus-visible:bg-black/40 focus-visible:text-white focus-visible:outline-none cursor-pointer disabled:opacity-50"
            >
              <Camera className="h-5 w-5 drop-shadow" />
            </button>

            {/* Always-visible camera badge — the inset-0 overlay above only
                appears on hover, which touch devices never trigger. This
                corner badge keeps the upload affordance discoverable on
                mobile; the button remains the actual (larger) tap target.
                pointer-events-none is REQUIRED: the badge paints on top of
                the button, so without it taps on the badge would hit the
                span and never reach the button (dead upload). */}
            <span
              aria-hidden
              className={`pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-card transition-opacity duration-200 ${
                savingAvatar ? "opacity-50" : ""
              }`}
            >
              <Camera className="h-3 w-3" />
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarFile}
            />
          </div>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="space-y-3">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder={bn ? "আপনার প্রদর্শনের নাম" : "Your display name"}
                  className={inputCls}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={savingName || !nameValue.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {savingName
                      ? bn ? "সংরক্ষণ হচ্ছে…" : "Saving…"
                      : bn ? "সংরক্ষণ" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(profile?.display_name || "");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {bn ? "বাতিল" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {profile?.display_name || (bn ? "বেনামী" : "Anonymous")}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Identity actions: edit name, avatar save/cancel/remove ── */}
        {!editingName && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-[84px]">
            <button
              type="button"
              onClick={() => {
                setNameValue(profile?.display_name || "");
                setEditingName(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" /> {bn ? "নাম সম্পাদনা করুন" : "Edit display name"}
            </button>

            {editingAvatar ? (
              <>
                <button
                  type="button"
                  onClick={saveAvatar}
                  disabled={savingAvatar || !avatarValue}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingAvatar
                    ? bn ? "সংরক্ষণ হচ্ছে…" : "Saving…"
                    : bn ? "অবতার সংরক্ষণ" : "Save avatar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAvatar(false);
                    setAvatarValue(null);
                    setAvatarFile(null);
                  }}
                  disabled={savingAvatar}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {bn ? "বাতিল" : "Cancel"}
                </button>
              </>
            ) : (
              hasSavedAvatar && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={savingAvatar}
                  className="inline-flex items-center gap-1 text-xs text-destructive/80 hover:text-destructive transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> {bn ? "অবতার সরান" : "Remove avatar"}
                </button>
              )
            )}
          </div>
        )}

        {/* ── Bio ───────────────────────────────────────────────── */}
        <div className="pt-6 border-t border-border/40">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1.5">
            {bn ? "পরিচিতি" : "About"}
          </p>
          {editingBio ? (
            <div className="space-y-3">
              <textarea
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value)}
                placeholder={
                  bn
                    ? "নিজের সম্পর্কে একটি ছোট বায়ো বা প্রিয় মাইন্ডফুলনেস উক্তি লিখুন…"
                    : "Write a short bio or a favorite mindfulness quote..."
                }
                rows={3}
                className={inputCls + " resize-none"}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveBio}
                  disabled={savingBio}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingBio
                    ? bn ? "সংরক্ষণ হচ্ছে…" : "Saving…"
                    : bn ? "বায়ো সংরক্ষণ" : "Save bio"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBio(false);
                    setBioValue(profile?.bio || "");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  {bn ? "বাতিল" : "Cancel"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {profile?.bio ? (
                <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  {bn ? "এখনো কোনো বায়ো নেই।" : "No bio yet."}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setBioValue(profile?.bio || "");
                  setEditingBio(true);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />{" "}
                {profile?.bio
                  ? bn ? "বায়ো সম্পাদনা করুন" : "Edit bio"
                  : bn ? "বায়ো যোগ করুন" : "Add bio"}
              </button>
            </div>
          )}
        </div>

        {/* ── Verification + Connected accounts (backend-only) ─── */}
        {!isMockMode() && (
          <>
            <div className="pt-6 border-t border-border/40 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground/60" />
                <div>
                  <p className="text-base text-foreground">{bn ? "ইমেইল যাচাইকরণ" : "Email verification"}</p>
                  <p className="text-sm text-muted-foreground/60 mt-0.5">
                    {bn ? "আপনার ইমেইল নিশ্চিত হয়েছে" : "Your email address is confirmed"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                {bn ? "যাচাইকৃত" : "Verified"}
              </span>
            </div>

            <div className="pt-6 border-t border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-4 w-4 text-muted-foreground/60" />
                <p className="text-base text-foreground">{bn ? "সংযুক্ত অ্যাকাউন্ট" : "Connected accounts"}</p>
              </div>
              <p className="text-sm text-muted-foreground/70">
                {bn
                  ? "Google দিয়ে সাইন-ইন সংযোগ ব্যবস্থাপনা এখানে আসবে।"
                  : "Manage your Google sign-in connection here."}
              </p>
            </div>
          </>
        )}
      </div>
    </SettingsSectionCard>
  );
}
