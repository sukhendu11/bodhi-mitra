import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminClaimStatus,
  claimAdminRole,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — Bodhi Mitra" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading } = useAuthSession();
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getAdminClaimStatus);
  const claim = useServerFn(claimAdminRole);

  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "ready"; adminExists: boolean; isAdmin: boolean }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    setStatus({ state: "loading" });
    fetchStatus()
      .then((r) =>
        setStatus({
          state: "ready",
          adminExists: r.adminExists,
          isAdmin: r.isAdmin,
        }),
      )
      .catch((e) =>
        setStatus({ state: "error", message: e.message ?? "Failed to load" }),
      );
  }, [user, loading, fetchStatus]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setStatus({ state: "idle" });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    setAuthBusy(true);
    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        if (data.session) toast.success("Account created");
        else toast.success("Check your email to confirm your account");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleClaim = async () => {
    setSubmitting(true);
    try {
      const r = await claim();
      toast.success(
        r.alreadyAdmin ? "You're already an admin" : "Admin access granted",
      );
      navigate({ to: "/admin" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to claim admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-serif text-4xl mb-3 text-center">Welcome</h1>
      <p className="text-sm text-muted-foreground mb-10 leading-relaxed text-center">
        Get started in two steps: sign in with your email, then claim admin
        access for this journal.
      </p>

      {/* Step 1: sign in */}
      <section className="border border-border/60 p-6 mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Step 1
        </p>
        <h2 className="font-serif text-lg mb-4">
          {authMode === "signin" ? "Sign in" : "Create account"}
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking session…</p>
        ) : user ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Signed in as{" "}
              <span className="font-medium">{user.email}</span>
            </p>
            <button
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground/60"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={authMode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground/60"
            />
            <button
              type="submit"
              disabled={authBusy}
              className="w-full px-6 py-3 text-sm tracking-wide border border-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
            >
              {authBusy
                ? "Please wait…"
                : authMode === "signin"
                ? "Sign in"
                : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {authMode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </section>

      {/* Step 2: claim admin */}
      <section className="border border-border/60 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Step 2
        </p>
        <h2 className="font-serif text-lg mb-4">Claim admin access</h2>

        {!user ? (
          <p className="text-sm text-muted-foreground">
            Sign in first to continue.
          </p>
        ) : status.state === "loading" || status.state === "idle" ? (
          <p className="text-sm text-muted-foreground">Checking status…</p>
        ) : status.state === "error" ? (
          <p className="text-sm text-destructive">{status.message}</p>
        ) : status.isAdmin ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              You already have admin access.
            </p>
            <Link
              to="/admin"
              className="inline-block w-full text-center px-6 py-3 text-sm tracking-wide border border-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              Go to Admin
            </Link>
          </div>
        ) : status.adminExists ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            An admin has already been assigned for this site. Ask the
            existing admin to grant you access from the dashboard.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              No admin exists yet. Claim admin access now to manage posts
              and site settings.
            </p>
            <button
              onClick={handleClaim}
              disabled={submitting}
              className="w-full px-6 py-3 text-sm tracking-wide border border-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
            >
              {submitting ? "Granting…" : "Grant me admin access"}
            </button>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-muted-foreground/70 leading-relaxed text-center">
        <Link to="/" className="hover:text-foreground">
          ← Back home
        </Link>
      </p>
    </div>
  );
}
