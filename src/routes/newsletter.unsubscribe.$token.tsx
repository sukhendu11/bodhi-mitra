import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { unsubscribeFromNewsletter } from "@/lib/newsletter";
import { useLang } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/newsletter/unsubscribe/$token")({
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useParams() as { token: string };
  const { lang } = useLang();
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const doUnsubscribe = useServerFn(unsubscribeFromNewsletter);

  useEffect(() => {
    if (!token) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doUnsubscribe({ data: { token } } as any)
      .then((result: any) => {
        if (result.success) {
          setStatus(result.alreadyUnsubscribed ? "already" : "success");
        } else {
          setStatus("error");
          setErrorMsg(result.error || "Failed to unsubscribe.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      });
  }, [token, doUnsubscribe]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-20">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card p-8 md:p-10 text-center shadow-sm">
          {status === "loading" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60">
                <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
              </span>
              <p className="mt-6 text-muted-foreground">
                {lang === "bn" ? "আনসাবস্ক্রাইব হচ্ছে..." : "Unsubscribing..."}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-saffron-500)] to-[var(--color-saffron-gold)] text-white shadow-md">
                <CheckCircle className="h-7 w-7" />
              </span>
              <h1 className="mt-6 font-serif text-2xl font-semibold">
                {lang === "bn" ? "সফলভাবে আনসাবস্ক্রাইব হয়েছে" : "Successfully Unsubscribed"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {lang === "bn"
                  ? "আপনি এখন আর নিউজলেটার ইমেল পাবেন না।"
                  : "You will no longer receive newsletter emails from us."}
              </p>
            </>
          )}

          {status === "already" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60">
                <CheckCircle className="h-7 w-7 text-muted-foreground" />
              </span>
              <h1 className="mt-6 font-serif text-2xl font-semibold">
                {lang === "bn" ? "ইতিমধ্যে আনসাবস্ক্রাইব করা হয়েছে" : "Already Unsubscribed"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {lang === "bn"
                  ? "আপনি ইতিমধ্যে নিউজলেটার থেকে আনসাবস্ক্রাইব করেছেন।"
                  : "You have already been unsubscribed from the newsletter."}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-7 w-7 text-destructive" />
              </span>
              <h1 className="mt-6 font-serif text-2xl font-semibold">
                {lang === "bn" ? "ত্রুটি" : "Error"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">{errorMsg}</p>
            </>
          )}

          <Link
            to="/"
            className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === "bn" ? "হোমে ফিরে যান" : "Return to homepage"}
          </Link>
        </div>
      </div>
    </div>
  );
}
