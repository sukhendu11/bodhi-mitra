import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { unsubscribeFromNewsletter } from "@/lib/newsletter";
import { useLang } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/newsletter/unsubscribe/$token" as any)({
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
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
            <p className="text-muted-foreground">
              {lang === "bn" ? "আনসাবস্ক্রাইব হচ্ছে..." : "Unsubscribing..."}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <h1 className="font-serif text-2xl font-semibold">
              {lang === "bn" ? "সফলভাবে আনসাবস্ক্রাইব হয়েছে" : "Successfully Unsubscribed"}
            </h1>
            <p className="text-muted-foreground">
              {lang === "bn"
                ? "আপনি এখন আর নিউজলেটার ইমেল পাবেন না।"
                : "You will no longer receive newsletter emails from us."}
            </p>
          </>
        )}

        {status === "already" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="font-serif text-2xl font-semibold">
              {lang === "bn" ? "ইতিমধ্যে আনসাবস্ক্রাইব করা হয়েছে" : "Already Unsubscribed"}
            </h1>
            <p className="text-muted-foreground">
              {lang === "bn"
                ? "আপনি ইতিমধ্যে নিউজলেটার থেকে আনসাবস্ক্রাইব করেছেন।"
                : "You have already been unsubscribed from the newsletter."}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="font-serif text-2xl font-semibold">
              {lang === "bn" ? "ত্রুটি" : "Error"}
            </h1>
            <p className="text-muted-foreground">{errorMsg}</p>
          </>
        )}

        <Link
          to="/"
          className="inline-block mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {lang === "bn" ? "হোমে ফিরে যান" : "Return to homepage"}
        </Link>
      </div>
    </div>
  );
}
