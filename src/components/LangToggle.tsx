import { useLang } from "@/lib/i18n";

/** Active pill stays a black pill with white text in both modes. The toggle container
    flips to white in dark mode (dark:bg-white) so the black pill remains visible instead
    of blending into the dark page background. */
const ACTIVE_PILL_CLASSES =
  "bg-foreground text-background dark:bg-zinc-900 dark:text-zinc-50";

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to বাংলা" : "Switch to English"}
      className={`inline-flex items-center rounded-full border border-border bg-background text-xs uppercase tracking-[0.18em] overflow-hidden select-none transition-colors dark:border-zinc-300 dark:bg-white ${className}`}
    >
      <span
        className={`px-2.5 py-1 transition-colors ${
          lang === "en" ? ACTIVE_PILL_CLASSES : "text-muted-foreground dark:text-zinc-500"
        }`}
      >
        EN
      </span>
      <span
        className={`px-2.5 py-1 transition-colors ${
          lang === "bn" ? ACTIVE_PILL_CLASSES : "text-muted-foreground dark:text-zinc-500"
        }`}
        style={{ fontFamily: "var(--font-bn)", letterSpacing: 0 }}
      >
        বাং
      </span>
    </button>
  );
}
