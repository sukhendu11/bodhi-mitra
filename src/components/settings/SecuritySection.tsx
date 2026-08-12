import { useState } from "react";
import { Lock, Eye, EyeOff, MonitorSmartphone, Link2, LogOut } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { isMockMode } from "@/lib/data-source";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { SettingsSectionCard } from "./SettingsSectionCard";

const inputCls =
  "w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors duration-200";

/**
 * Security — change password (mock mode blocks it for demo accounts).
 * Connected providers, active sessions and "sign out all devices" are
 * backend-only (Supabase auth) and hidden until the real backend is wired.
 */
export function SecuritySection() {
  const { lang } = useLang();
  const bn = lang === "bn";

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

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

  return (
    <SettingsSectionCard icon={Lock} title={bn ? "নিরাপত্তা" : "Security"} id="security">
      <div className="space-y-6">
        {/* Password */}
        <div>
          <button
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-4 w-4" />
            {showPasswordForm ? (bn ? "বাতিল" : "Cancel") : (bn ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change password")}
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 max-w-sm">
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
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
                disabled={changingPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                className="px-4 py-2 text-xs"
              >
                {changingPassword
                  ? bn ? "আপডেট হচ্ছে…" : "Updating…"
                  : bn ? "পাসওয়ার্ড আপডেট করুন" : "Update password"}
              </BrandCtaButton>
            </form>
          )}
        </div>

        {/* Connected providers + sessions + sign out all (backend-only) */}
        {!isMockMode() && (
          <>
            <div className="pt-6 border-t border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-4 w-4 text-muted-foreground/60" />
                <p className="text-sm text-foreground">{bn ? "সংযুক্ত প্রদানকারী" : "Connected providers"}</p>
              </div>
              <p className="text-xs text-muted-foreground/70">
                {bn
                  ? "গুগল প্রভৃতি সাইন-ইন প্রদানকারীর সংযোগ এখানে দেখা যাবে।"
                  : "Your sign-in providers (e.g. Google) will appear here."}
              </p>
            </div>

            <div className="pt-6 border-t border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <MonitorSmartphone className="h-4 w-4 text-muted-foreground/60" />
                <p className="text-sm text-foreground">{bn ? "সক্রিয় সেশন" : "Active sessions"}</p>
              </div>
              <p className="text-xs text-muted-foreground/70">
                {bn
                  ? "এই ডিভাইসটি বর্তমানে সাইন-ইন আছে।"
                  : "This device is currently signed in."}
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" />
                {bn ? "সব ডিভাইস থেকে সাইন আউট" : "Sign out of all devices"}
              </button>
            </div>
          </>
        )}
      </div>
    </SettingsSectionCard>
  );
}
