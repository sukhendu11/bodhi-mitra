import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { Loader2, CheckCircle } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage("");

    try {
      const result = await (doSubscribe as any)({ data: { email: trimmed } });
      if (result.alreadySubscribed) {
        setMessage("You're already subscribed!");
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
            className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
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
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === "loading"}
          className="flex-1 min-w-0 border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="px-4 py-2 text-xs uppercase tracking-[0.15em] font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all duration-200 shrink-0 flex items-center gap-1.5"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Subscribe
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-destructive">{message}</p>}
    </form>
  );
}
