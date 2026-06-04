import { useLang } from "@/lib/i18n";

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to বাংলা" : "Switch to English"}
      className={`inline-flex items-center rounded-full border border-border bg-background text-[11px] uppercase tracking-[0.18em] overflow-hidden select-none ${className}`}
    >
      <span
        className={`px-2.5 py-1 transition-colors ${
          lang === "en" ? "bg-foreground text-background" : "text-muted-foreground"
        }`}
      >
        EN
      </span>
      <span
        className={`px-2.5 py-1 transition-colors ${
          lang === "bn" ? "bg-foreground text-background" : "text-muted-foreground"
        }`}
        style={{ fontFamily: "var(--font-bn)", letterSpacing: 0 }}
      >
        বাং
      </span>
    </button>
  );
}
