import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { callFn } from "@/lib/call-fn";
import { Loader2, CheckCircle } from "lucide-react";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { useLang } from "@/lib/i18n";
import { useNotificationGate } from "@/hooks/useNotificationGate";

interface NewsletterSignupProps {
  title?: string;
  text?: string;
  compact?: boolean;
}

export function NewsletterSignup({ title, text, compact }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const doSubscribe = useServerFn(subscribeToNewsletter);
  const { lang } = useLang();
  const bn = lang === "bn";
  const { canNotify } = useNotificationGate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage("");

    try {
      const result = await callFn(doSubscribe, { email: trimmed });
      if (result.alreadySubscribed) {
        setMessage("You're already subscribed!");
      } else if (!canNotify("newsletter")) {
        // "Newsletter" preference off — subscribe still works, but the note
        // makes the mute visible (Settings → Notifications).
        setMessage(bn
          ? "সাবস্ক্রাইব হয়েছে — তবে আপনার সেটিংসে নিউজলেটার নিঃশব্দ করা আছে।"
          : "Subscribed — but newsletters are muted in your notification settings.");
      } else {
        setMessage("Thank you for subscribing!");
      }
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "success") {
    return (
      <div
        className={`flex items-start gap-3 ${compact ? "mt-3" : "p-4 bg-secondary/20 border border-border/60"}`}
      >
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{message}</p>
          <button
            onClick={() => setStatus("idle")}
            className="text-xs text-muted-foreground hover:text-foreground underline mt-1 transition-colors duration-200"
          >
            Subscribe another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "mt-3" : ""}>
      {title && <p className="font-serif text-lg mb-2">{title}</p>}
      {text && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
          {text}
        </p>
      )}
      <div className="space-y-3">
        <div className="border border-foreground/20 rounded-lg focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40 transition-all duration-300 bg-secondary/10">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={status === "loading"}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 focus:outline-none disabled:opacity-50"
          />
        </div>
        <BrandCtaButton
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="w-full px-4 py-2.5 text-xs uppercase tracking-[0.1em] rounded-full"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </BrandCtaButton>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-destructive">{message}</p>}
    </form>
  );
}
