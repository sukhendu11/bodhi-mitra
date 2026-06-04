import { getSiteName } from "@/lib/siteSettings";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    message: (search.message as string) || "",
    redirect: (search.redirect as string) || "/",
  }),
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({ meta: [{ title: `Sign in — ${loaderData}` }] }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const { user, loading } = useAuthSession();
  const navigate = useNavigate();
  const { message, redirect } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Surface OAuth errors returned by Supabase via URL hash/query
  useEffect(() => {
    if (typeof window === "undefined") return;
    const parse = (s: string) =>
      new URLSearchParams(s.startsWith("#") || s.startsWith("?") ? s.slice(1) : s);
    const hash = parse(window.location.hash);
    const query = parse(window.location.search);
    const err = hash.get("error") || query.get("error");
    const desc = hash.get("error_description") || query.get("error_description");
    const code = hash.get("error_code") || query.get("error_code");
    if (err) {
      const msg = `${err}${code ? ` (${code})` : ""}${desc ? `: ${decodeURIComponent(desc.replace(/\+/g, " "))}` : ""}`;
      console.error("[OAuth] redirect returned error", { error: err, code, description: desc, url: window.location.href });
      setOauthError(msg);
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirect, replace: true });
    }
  }, [user, loading, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    setSubmitting(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Welcome back");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirect && redirect !== "/" ? redirect : ""}`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created");
      return;
    }
    toast.success("Check your email to confirm your account");
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setOauthError(null);
    const redirectTo = `${window.location.origin}/login`;
    console.info("[OAuth] starting Google sign-in", { redirectTo });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        console.error("[OAuth] signInWithOAuth error", error);
        setOauthError(`${error.name || "Error"}: ${error.message}`);
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      console.info("[OAuth] redirecting to provider", { url: data?.url });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[OAuth] unexpected exception", e);
      setOauthError(`Unexpected: ${msg}`);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-32">
      <h1 className="font-serif text-4xl mb-4 text-center">Welcome</h1>
      <p className="text-sm text-muted-foreground mb-12 leading-relaxed text-center">
        {mode === "signin"
          ? "Sign in to share reflections on the writings."
          : "Create an account to begin."}
      </p>

      {message && (
        <div className="border border-border/60 bg-secondary/20 py-6 px-6 mb-8">
          <p className="text-sm text-foreground leading-relaxed">{message}</p>
        </div>
      )}

      <div className="flex border-b border-border/60 mb-8 text-xs uppercase tracking-[0.2em]">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 pb-3 transition-colors ${
            mode === "signin"
              ? "text-foreground border-b border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 pb-3 transition-colors ${
            mode === "signup"
              ? "text-foreground border-b border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Create account
        </button>
      </div>

      {oauthError && (
        <div className="border border-destructive/40 bg-destructive/10 py-4 px-4 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-destructive mb-2">
            Google sign-in failed
          </p>
          <p className="text-sm text-foreground leading-relaxed break-words">
            {oauthError}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Open the browser console for the full error payload and request URL.
          </p>
        </div>
      )}


      <button
        type="button"
        onClick={handleGoogle}
        disabled={submitting}
        className="w-full mb-6 px-6 py-3 text-sm tracking-wide border border-border hover:bg-secondary transition-colors disabled:opacity-40 flex items-center justify-center gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex-1 h-px bg-border" />
        or
        <span className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground/60"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
            className="mt-2 w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground/60"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-3 text-sm tracking-wide border border-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
        >
          {submitting
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
            ? "Sign in"
            : "Create account"}
        </button>
      </form>

      <p className="mt-10 text-xs text-muted-foreground leading-relaxed text-center">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-foreground hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-foreground hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>

      <p className="mt-4 text-xs text-muted-foreground/70 leading-relaxed text-center">
        <Link to="/" className="hover:text-foreground">
          ← Back home
        </Link>
      </p>
    </div>
  );
}
