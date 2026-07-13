import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSiteName } from "@/lib/siteSettings";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/reset-password")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({ meta: [{ title: `Reset Password — ${loaderData}` }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Supabase Auth sends the user to this page with a hash fragment containing
    // the access_token and refresh_token. We need to recover the session from
    // the URL hash before the user can reset their password.
    let errorTimeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const showErrorAfterDelay = (message: string) => {
      // Wait 3s before showing the error — the auth state listener may
      // still process the URL hash and set the session asynchronously.
      errorTimeout = setTimeout(() => {
        if (!cancelled) {
          setError(message);
          setVerifying(false);
        }
      }, 3000);
    };

    const checkSession = async () => {
      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (cancelled) return;

        if (data?.session) {
          clearTimeout(errorTimeout);
          setVerifying(false);
          return;
        }

        // No session yet — the hash may still be processing.
        // The onAuthStateChange listener should catch it.
        showErrorAfterDelay(
          "Unable to verify reset link. Please request a new password reset.",
        );
      } catch (e: unknown) {
        if (!cancelled) {
          clearTimeout(errorTimeout);
          setError(
            e instanceof Error ? e.message : "An unexpected error occurred",
          );
          setVerifying(false);
        }
      }
    };

    // Subscribe to auth state changes in case the session is set asynchronously
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        clearTimeout(errorTimeout);
        setVerifying(false);
        setError(null);
      }
    });

    checkSession();

    return () => {
      cancelled = true;
      clearTimeout(errorTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    setCompleted(true);
    toast.success("Password updated successfully");

    // Redirect to login after a brief delay
    setTimeout(() => {
      navigate({ to: "/login", search: { message: "", redirect: "/" }, replace: true });
    }, 2500);
  };

  if (verifying) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <Skeleton className="h-8 w-8 rounded-full mx-auto mb-6" />
        <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive/60 mb-6" />
        <h1 className="font-serif text-3xl mb-3">Invalid link</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">{error}</p>
        <Link
          to="/forgot-password"
          search={{} as any}
          params={{} as any}
          className="text-xs text-foreground hover:underline underline-offset-2"
        >
          Request a new reset link →
        </Link>
        <p className="mt-4 text-xs text-muted-foreground/70">
          <Link to="/login" search={{ message: "", redirect: "/" }} className="hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-6" />
        <h1 className="font-serif text-3xl mb-3">Password updated</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Your password has been changed successfully. Redirecting you to sign in…
        </p>
        <Link
          to="/login"
          search={{ message: "", redirect: "/" }}
          className="text-xs text-foreground hover:underline underline-offset-2"
        >
          Sign in now →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-32">
      <h1 className="font-serif text-3xl mb-3">Set new password</h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-10">
        Choose a new password for your account. It must be at least 6 characters.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            New password
          </span>
          <div className="relative mt-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="pl-11 pr-4"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Confirm new password
          </span>
          <div className="relative mt-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="pl-11 pr-4"
            />
          </div>
        </label>

        <Button
          type="submit"
          disabled={submitting || !password || !confirmPassword}
          variant="outline"
          className="w-full px-6 py-3 text-sm tracking-wide border-foreground hover:bg-foreground hover:text-background"
        >
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
