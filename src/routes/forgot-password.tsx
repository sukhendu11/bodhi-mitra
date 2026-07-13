import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSiteName } from "@/lib/siteSettings";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: () => ({}) as Record<string, never>,
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({ meta: [{ title: `Forgot Password — ${loaderData}` }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Check your email for the reset link");
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-6" />
        <h1 className="font-serif text-3xl mb-3">Check your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          We've sent a password reset link to{" "}
          <span className="text-foreground font-medium">{email}</span>.
          Click the link in the email to reset your password. It expires in 1 hour.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Send again to a different email
        </button>
        <p className="mt-4 text-xs text-muted-foreground/70">
          <Link to="/login" search={{ message: "", redirect: "/" }} className="hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-32">
      <Link
        to="/login"
        search={{ message: "", redirect: "/" }}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to sign in
      </Link>

      <h1 className="font-serif text-3xl mt-8 mb-3">Forgot password?</h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-10">
        Enter the email address you used to sign up, and we'll send you a link
        to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Email address
          </span>
          <div className="relative mt-2">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-11 pr-4"
            />
          </div>
        </label>

        <Button
          type="submit"
          disabled={submitting || !email.trim()}
          variant="outline"
          className="w-full px-6 py-3 text-sm tracking-wide border-foreground hover:bg-foreground hover:text-background"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}
