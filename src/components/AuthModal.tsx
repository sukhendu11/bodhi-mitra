import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandCtaButton } from "@/components/BrandCtaButton";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback fired after successful auth — for resume flows */
  onSuccess?: () => void;
}

type Mode = "signin" | "signup";

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const { lang } = useLang();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    setSubmitting(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(lang === "bn" ? "ফিরে আসায় স্বাগতম" : "Welcome back");
      onOpenChange(false);
      onSuccess?.();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success(lang === "bn" ? "অ্যাকাউন্ট তৈরি হয়েছে" : "Account created");
      onOpenChange(false);
      onSuccess?.();
      return;
    }
    toast.success(lang === "bn" ? "আপনার অ্যাকাউন্ট নিশ্চিত করতে ইমেইল চেক করুন" : "Check your email to confirm your account");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : lang === "bn" ? "Google সাইন-ইন ব্যর্থ হয়েছে" : "Google sign-in failed");
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors duration-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-center">
            {mode === "signin" ? (lang === "bn" ? "ফিরে আসায় স্বাগতম" : "Welcome back") : (lang === "bn" ? "একটি অ্যাকাউন্ট তৈরি করুন" : "Create an account")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full px-6 py-3 text-sm tracking-wide border border-border hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
              />
            </svg>
            {lang === "bn" ? "Google দিয়ে চালিয়ে যান" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="flex-1 h-px bg-border" />
            {lang === "bn" ? "বা" : "or"}
            <span className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? (lang === "bn" ? "কমপক্ষে ৬ অক্ষর" : "At least 6 characters") : (lang === "bn" ? "পাসওয়ার্ড" : "Password")}
              className={inputCls}
            />
            <BrandCtaButton
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 tracking-wide"
            >
              {submitting ? (lang === "bn" ? "অনুগ্রহ করে অপেক্ষা করুন…" : "Please wait…") : mode === "signin" ? (lang === "bn" ? "সাইন ইন" : "Sign in") : (lang === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create account")}
            </BrandCtaButton>
          </form>

          {/* Toggle mode */}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? (lang === "bn" ? "নতুন? একটি অ্যাকাউন্ট তৈরি করুন" : "New here? Create an account") : (lang === "bn" ? "ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন" : "Already have an account? Sign in")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
