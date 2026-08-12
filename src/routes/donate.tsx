import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLang, formatMoney, toBanglaDigits } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { Gift, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { LotusIcon } from "@/components/LotusIcon";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/donate")({
  head: () => seoHead({
    title: "Donate",
    description: "Support the continuation of free wisdom resources. Every donation helps us publish more books, articles, and meditations.",
    path: "/donate",
  }),
  component: DonatePage,
});

/** Quick-donate presets (BDT). Clicking one fills the custom amount. */
const PRESET_AMOUNTS = [200, 500, 1000, 2000];

function DonatePage() {
  const { lang } = useLang();
  const [amount, setAmount] = useState("");
  const [donated, setDonated] = useState(false);

  const parsed = parseFloat(amount) || 0;
  const valid = parsed > 0;

  const handleDonate = () => {
    if (!valid) return;
    // Simulated donation flow — the payment-provider interface (AD-026) will
    // replace this when the gateway is connected. No alert(); premium state.
    setDonated(true);
  };

  const reset = () => {
    setAmount("");
    setDonated(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Reveal delay={0}>
        <div className="flex items-center gap-3 mb-6">
          <LotusIcon size={20} className="opacity-60" />
          {/* Bangla alignment — same measured fix as the mobile donate CTA:
              Noto Sans Bengali ink rides ~2.3px high of its box center at
              14px; scaled to this text-xs (12px) label that is ~2px, so nudge
              the Bangla word down with a translate (line-height alone cannot
              shift the ink). leading-[20px] matches the 20px icon. */}
          <p
            className={`text-xs uppercase tracking-[0.25em] text-muted-foreground leading-[20px] ${
              lang === "bn" ? "translate-y-[2px]" : ""
            }`}
          >
            {lang === "bn" ? "দান" : "Donate"}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">
          {lang === "bn" ? "দান করুন" : "Support Our Mission"}
        </h1>
      </Reveal>

      <Reveal delay={0.2}>
        <p className="mt-6 text-muted-foreground leading-relaxed text-lg max-w-xl">
          {lang === "bn"
            ? "আপনার দান বিনামূল্যে জ্ঞান সম্পদ তৈরি করতে সাহায্য করে — বই, নিবন্ধ এবং ধ্যান সকলের জন্য উন্মুক্ত। প্রতিটি অবদান গুরুত্বপূর্ণ।"
            : "Your donation helps us create free wisdom resources — books, articles, and meditations open to all. Every contribution matters."}
        </p>
      </Reveal>

      {donated ? (
        <Reveal delay={0.3}>
          <div className="mt-14 rounded-2xl border border-border/60 bg-card p-8 md:p-10 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-saffron-500)] to-[var(--color-saffron-gold)] text-white shadow-md">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="mt-6 font-serif text-2xl md:text-3xl">
              {lang === "bn" ? "ধন্যবাদ!" : "Thank you!"}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {lang === "bn"
                ? `আপনার ${toBanglaDigits(parsed)} টাকা দান সাদরে গ্রহণ করা হয়েছে। আপনার উদারতা সকলের জন্য জ্ঞান উন্মুক্ত রাখতে সাহায্য করে।`
                : `Your donation of ${formatMoney(parsed, lang)} is gratefully received. Your generosity keeps wisdom open to all.`}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <BrandCtaButton onClick={reset} className="px-5 py-2.5 text-sm">
                <RefreshCw className="h-4 w-4" />
                {lang === "bn" ? "আরও দান করুন" : "Donate again"}
              </BrandCtaButton>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.3}>
          <div className="mt-14 space-y-8">
            {/* Preset amount chips */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
                {lang === "bn" ? "আপনার দানের পরিমাণ" : "Your donation"}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_AMOUNTS.map((preset) => {
                  const active = parsed === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      aria-pressed={active}
                      className={cn(
                        "px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer",
                        active
                          ? "bg-foreground text-background border-foreground shadow-md"
                          : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-foreground/30 hover:bg-secondary/50",
                      )}
                    >
                      {lang === "bn" ? toBanglaDigits(preset) : `BDT ${preset}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">{lang === "bn" ? "টাকা" : "BDT"}</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={lang === "bn" ? "যেকোনো পরিমাণ" : "Any amount helps"}
                className="w-full pl-14 pr-4 py-4 border border-border/60 rounded-xl bg-background text-foreground text-lg placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 focus:outline-none focus:border-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
                aria-label={lang === "bn" ? "দানের পরিমাণ" : "Donation amount"}
              />
            </div>

            <BrandCtaButton
              onClick={handleDonate}
              disabled={!valid}
              className="w-full py-4 text-base"
            >
              <Gift className="h-5 w-5" />
              {lang === "bn"
                ? (parsed > 0 ? `${toBanglaDigits(parsed)} টাকা দান করুন` : "দান করুন")
                : `Donate ${parsed > 0 ? `BDT ${parsed}` : "now"}`}
            </BrandCtaButton>

            <div className="text-center space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                {lang === "bn"
                  ? "আপনার পেমেন্ট নিরাপদে প্রক্রিয়া করা হয়।"
                  : "Your payment is processed securely."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:donate@sabbesatta.com" className="hover:underline">
                  {lang === "bn" ? "প্রশ্ন আছে? ইমেইল করুন" : "Questions? Email us"}
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.4}>
        <div className="mt-16 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {lang === "bn" ? "হোমে ফিরে যান" : "Back to home"}
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
